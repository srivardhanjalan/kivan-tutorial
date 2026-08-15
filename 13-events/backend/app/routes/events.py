import uuid
from typing import Optional

from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import (
    event_hosts_table,
    event_invitees_table,
    event_wishlists_table,
    events_table,
    users_table,
    wishlists_table,
)
from app.dependencies.auth import get_current_user_id
from app.models.events import (
    ActionResponse,
    Event,
    EventCreate,
    EventDetailResponse,
    EventHostCreate,
    EventUpdate,
    EventWishlistCreate,
    MyEventsResponse,
)
from app.utils.dynamo import (
    batch_get_items,
    get_item_or_404,
    query_all_pages,
)
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
)
from app.utils.timestamps import utc_now_iso
from app.utils.wishlist_access import get_owned_wishlist

router = APIRouter(prefix="/events", tags=["events"])


# ── Event-domain helpers ─────────────────────────────────────────────────────
# The whole events surface funnels its access checks through these. is_event_*
# read the child tables by composite key; get_user_email backs the by-email
# invitee reach (an event invited by email address, claimed once that address
# signs up). Kept at file top, not a util module: every caller is in this file.


def get_event_or_404(event_id: str) -> dict:
    """Fetch an event by id or raise 404: the events spelling of get-or-404."""
    return get_item_or_404(events_table, event_id, "Event not found")


def is_event_host(event_id: str, user_id: str) -> bool:
    """Is this user a host of the event? A direct GetItem on the composite key.
    Hosts are flat and role-less: being a host is the sole write credential."""
    response = event_hosts_table.get_item(
        Key={"event_id": event_id, "user_id": user_id}
    )
    return "Item" in response


def is_event_invitee(event_id: str, user_id: str, email: Optional[str]) -> bool:
    """Is this user invited, by user id OR by email? An invite can be addressed
    to a raw email before that person has an account; once they sign up with it,
    the same row is theirs. So access is checked against both identifiers."""
    for invitee_id in filter(None, [user_id, email]):
        response = event_invitees_table.get_item(
            Key={"event_id": event_id, "invitee_id": invitee_id}
        )
        if "Item" in response:
            return True
    return False


def get_user_email(user_id: str) -> Optional[str]:
    """The user's email, or None if the record is gone. Backs the by-email
    invitee reach on /me and the detail access check."""
    response = users_table.get_item(Key={"id": user_id})
    return response["Item"].get("email") if "Item" in response else None


def get_event_wishlists(event_id: str) -> list[dict]:
    """The wishlists linked to an event, in link order. One Query for the link
    rows, one BatchGetItem for the wishlists themselves (the N+1 fix); a link
    whose wishlist was since deleted is simply skipped."""
    links = query_all_pages(
        event_wishlists_table,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )
    wishlist_ids = [link["wishlist_id"] for link in links]
    if not wishlist_ids:
        return []
    wishlists_map = {
        item["id"]: item
        for item in batch_get_items(wishlists_table, [{"id": wid} for wid in wishlist_ids])
    }
    return [wishlists_map[wid] for wid in wishlist_ids if wid in wishlists_map]


def get_event_hosts(event_id: str) -> list[dict]:
    """The host User records for an event, in query order. One Query for the
    host edges, one BatchGetItem to resolve their ids; a host whose account is
    gone is skipped."""
    hosts = query_all_pages(
        event_hosts_table,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )
    host_ids = [host["user_id"] for host in hosts]
    users_map = {
        item["id"]: item
        for item in batch_get_items(users_table, [{"id": uid} for uid in host_ids])
    }
    return [users_map[uid] for uid in host_ids if uid in users_map]


def require_host(event_id: str, user_id: str, action: str) -> None:
    """Guard a host-only mutation: 403 unless the caller hosts the event. The
    event's existence is the caller's to check first (a 404 must precede a
    403)."""
    if not is_event_host(event_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only hosts can {action}",
        )


# ── Event CRUD ───────────────────────────────────────────────────────────────
# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop (the repo-wide route idiom).


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate, user_id: str = Depends(get_current_user_id)):
    """Create an event and make the creator its first host. Same photo
    discipline as the wishlist create: store the planned permanent URL, write,
    and only then claim the pending object: a failed write must never promote
    an object no record references."""
    stored = to_claim = None
    if event.image_url is not None:
        # No prior object on a create, so plan against None: nothing to delete
        stored, to_claim, _ = plan_photo_update(event.image_url, None, user_id)

    event_id = str(uuid.uuid4())
    now = utc_now_iso()
    item = {
        "id": event_id,
        "name": event.name,
        "description": event.description,
        "image_url": stored,
        "is_public": event.is_public,
        "event_type": event.event_type,
        "event_date": event.event_date,
        "location": event.location,
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    # Sparse PublicEventsIndex key: written ONLY on public events (booleans
    # can't be GSI keys), so the public feed is a Query on this partition, not a
    # full-table Scan. update_event keeps it in sync when is_public flips.
    if event.is_public:
        item["public_marker"] = "PUBLIC"
    events_table.put_item(Item=item)

    # The creator is auto-inserted as the first host: the one invariant later
    # host removals defend (an event can't lose its last host).
    event_hosts_table.put_item(
        Item={
            "event_id": event_id,
            "user_id": user_id,
            "added_at": now,
            "added_by": user_id,
        }
    )

    if to_claim:
        claim_pending_photo(to_claim)
    return item


@router.get("/me", response_model=MyEventsResponse)
def get_my_events(user_id: str = Depends(get_current_user_id)):
    """The events I host and the events I'm invited to. Hosting comes off
    event_hosts' UserIdIndex; invited comes off event_invitees' InviteeIdIndex,
    queried by BOTH my user id AND my email (an invite addressed to my email
    before I signed up is mine now). One BatchGetItem then hydrates every id."""
    hosting_ids = [
        host["event_id"]
        for host in query_all_pages(
            event_hosts_table,
            IndexName="UserIdIndex",
            KeyConditionExpression=Key("user_id").eq(user_id),
        )
    ]

    # Invited: by user id, then also by email; dedup, keeping each event's RSVP
    invited_ids: list[str] = []
    rsvp_by_event: dict[str, str] = {}
    invitee_keys = [user_id]
    user_email = get_user_email(user_id)
    if user_email:
        invitee_keys.append(user_email)
    for invitee_key in invitee_keys:
        for invitee in query_all_pages(
            event_invitees_table,
            IndexName="InviteeIdIndex",
            KeyConditionExpression=Key("invitee_id").eq(invitee_key),
        ):
            event_id = invitee["event_id"]
            if event_id not in rsvp_by_event:
                invited_ids.append(event_id)
            rsvp_by_event[event_id] = invitee.get("rsvp_status", "pending")

    # One batched fetch for every event across both lists
    all_ids = list(set(hosting_ids + invited_ids))
    events_map = {
        item["id"]: item
        for item in batch_get_items(events_table, [{"id": eid} for eid in all_ids])
    }

    hosting = [events_map[eid] for eid in hosting_ids if eid in events_map]
    invited = [
        {**events_map[eid], "my_rsvp_status": rsvp_by_event.get(eid, "pending")}
        for eid in invited_ids
        if eid in events_map
    ]
    return {"hosting": hosting, "invited": invited}


@router.get("/public", response_model=list[Event])
def get_public_events(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    _user_id: str = Depends(get_current_user_id),
):
    """Public events, newest first. A Query on the sparse PublicEventsIndex
    (only public events carry public_marker), never a Scan.

    Pagination is applied in Python AFTER fetching every page: an honest O(all
    public events) slice, kept as-is from the reference. While the public feed
    is small this is simpler than cursor pagination, and the read stays one
    partition. It becomes a cursor when the public feed outgrows one screen's
    worth of pages (noted in the polish ledger)."""
    events = query_all_pages(
        events_table,
        IndexName="PublicEventsIndex",
        KeyConditionExpression=Key("public_marker").eq("PUBLIC"),
        ScanIndexForward=False,  # newest first
    )
    return events[offset:offset + limit]


@router.get("/{event_id}", response_model=EventDetailResponse)
def get_event(event_id: str, user_id: str = Depends(get_current_user_id)):
    """An event's full detail: the event, its hosts, its linked wishlists, and
    whether the caller is a host (which unlocks edit/delete). Access is host OR
    invitee OR public: a public event surfaced via /events/public must not 403
    when tapped, so viewing one you weren't invited to is deliberate."""
    event = get_event_or_404(event_id)

    is_host = is_event_host(event_id, user_id)
    if not (is_host or event.get("is_public") or
            is_event_invitee(event_id, user_id, get_user_email(user_id))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event",
        )

    return {
        "event": event,
        "hosts": get_event_hosts(event_id),
        "wishlists": get_event_wishlists(event_id),
        "is_host": is_host,
    }


@router.put("/{event_id}", response_model=Event)
def update_event(
    event_id: str,
    update: EventUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update only the fields the body carries (exclude_unset). Host-only. The
    write is field-scoped and guarded (never a full-item rewrite from a stale
    read, the wishlist-update discipline), and the sparse public_marker is
    re-asserted every time to match is_public: SET on public, REMOVE on private.
    The cover swap follows the key-based photo discipline: plan, write, then
    run the S3 claim/delete only after the write commits (the wishlist idiom)."""
    existing = get_event_or_404(event_id)
    require_host(event_id, user_id, "update this event")

    update_data = update.model_dump(exclude_unset=True)
    to_claim = to_delete = None
    # image_url:null is ignored (removing a cover isn't a step-13 flow); a new
    # non-None value swaps the photo through the shared plan.
    if update_data.get("image_url") is not None:
        stored, to_claim, to_delete = plan_photo_update(
            update_data["image_url"], existing.get("image_url"), user_id
        )
        if stored is not None:
            update_data["image_url"] = stored
        else:
            update_data.pop("image_url")
    else:
        update_data.pop("image_url", None)

    changes = {**update_data, "updated_at": utc_now_iso()}
    names = {f"#f{i}": field for i, field in enumerate(changes)}
    values = {f":v{i}": value for i, value in enumerate(changes.values())}
    set_clause = "SET " + ", ".join(f"#f{i} = :v{i}" for i in range(len(changes)))

    # Re-assert the sparse marker against the RESULTING is_public (an omitted
    # is_public keeps the stored value), so the index never drifts.
    resulting_public = update_data.get("is_public", existing.get("is_public", False))
    names["#pm"] = "public_marker"
    if resulting_public:
        values[":pm"] = "PUBLIC"
        expression = f"{set_clause}, #pm = :pm"
    else:
        expression = f"{set_clause} REMOVE #pm"

    result = events_table.update_item(
        Key={"id": event_id},
        UpdateExpression=expression,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
        ConditionExpression="attribute_exists(id)",
        ReturnValues="ALL_NEW",
    )

    if to_claim:
        claim_pending_photo(to_claim)
    if to_delete:
        delete_photo_by_url(to_delete)
    return result["Attributes"]


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete an event and everything hanging off it: the cover object, and
    every host, invitee, and wishlist-link row. Host-only.

    Cover and child rows go FIRST, the event row LAST, so an INTERRUPTED cascade
    (crash, instance recycle) leaves only states a retry can finish: the event
    row still exists to drive the whole teardown again. The reverse order would
    strand orphaned child rows with no event to find them by (the wishlist
    cascade's discipline)."""
    existing = get_event_or_404(event_id)
    require_host(event_id, user_id, "delete this event")

    hosts = query_all_pages(
        event_hosts_table, KeyConditionExpression=Key("event_id").eq(event_id)
    )
    invitees = query_all_pages(
        event_invitees_table, KeyConditionExpression=Key("event_id").eq(event_id)
    )
    links = query_all_pages(
        event_wishlists_table, KeyConditionExpression=Key("event_id").eq(event_id)
    )

    delete_photo_by_url(existing.get("image_url"))

    with event_hosts_table.batch_writer() as batch:
        for host in hosts:
            batch.delete_item(Key={"event_id": event_id, "user_id": host["user_id"]})
    with event_invitees_table.batch_writer() as batch:
        for invitee in invitees:
            batch.delete_item(
                Key={"event_id": event_id, "invitee_id": invitee["invitee_id"]}
            )
    with event_wishlists_table.batch_writer() as batch:
        for link in links:
            batch.delete_item(
                Key={"event_id": event_id, "wishlist_id": link["wishlist_id"]}
            )

    events_table.delete_item(Key={"id": event_id})
    return None


# ── Host management ──────────────────────────────────────────────────────────
# Co-hosts are a flat set: every host can edit, delete, add and remove hosts,
# and link wishlists. The one invariant is that an event can't lose its last
# host. The co-host PICKER UI arrives with invitees; these endpoints back it.


@router.post("/{event_id}/hosts", response_model=ActionResponse)
def add_event_host(
    event_id: str,
    host: EventHostCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Promote a user to co-host. Host-only. 404 if the user to add doesn't
    exist, 400 if they already host the event."""
    get_event_or_404(event_id)
    require_host(event_id, user_id, "add hosts")
    get_item_or_404(users_table, host.user_id, "User not found")
    if is_event_host(event_id, host.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That user is already a host of this event",
        )
    event_hosts_table.put_item(
        Item={
            "event_id": event_id,
            "user_id": host.user_id,
            "added_at": utc_now_iso(),
            "added_by": user_id,
        }
    )
    return {"success": True, "message": "Host added"}


@router.delete("/{event_id}/hosts/{host_id}", response_model=ActionResponse)
def remove_event_host(
    event_id: str,
    host_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Remove a co-host. Host-only. 400 if it would leave the event hostless:
    an event always keeps at least one host (the delete-event path is how a lone
    host tears the whole thing down)."""
    get_event_or_404(event_id)
    require_host(event_id, user_id, "remove hosts")
    hosts = query_all_pages(
        event_hosts_table, KeyConditionExpression=Key("event_id").eq(event_id)
    )
    if len(hosts) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last host of an event",
        )
    event_hosts_table.delete_item(Key={"event_id": event_id, "user_id": host_id})
    return {"success": True, "message": "Host removed"}


# ── Wishlist linking ─────────────────────────────────────────────────────────


@router.post("/{event_id}/wishlists", response_model=ActionResponse)
def link_wishlist_to_event(
    event_id: str,
    link: EventWishlistCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Link a wishlist to an event. Host-only, and the caller must OWN the
    wishlist (get_owned_wishlist 404s a missing one and 403s one you don't own):
    a host attaches their own collections, never someone else's. 400 if it's
    already linked."""
    get_event_or_404(event_id)
    require_host(event_id, user_id, "link wishlists to this event")
    get_owned_wishlist(link.wishlist_id, user_id)
    existing = event_wishlists_table.get_item(
        Key={"event_id": event_id, "wishlist_id": link.wishlist_id}
    )
    if "Item" in existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That wishlist is already linked to this event",
        )
    event_wishlists_table.put_item(
        Item={
            "event_id": event_id,
            "wishlist_id": link.wishlist_id,
            "linked_at": utc_now_iso(),
            "linked_by": user_id,
        }
    )
    return {"success": True, "message": "Wishlist linked"}


@router.delete("/{event_id}/wishlists/{wishlist_id}", response_model=ActionResponse)
def unlink_wishlist_from_event(
    event_id: str,
    wishlist_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Unlink a wishlist from an event. Host-only. Idempotent: unlinking one
    that isn't linked is a no-op DeleteItem, not an error."""
    get_event_or_404(event_id)
    require_host(event_id, user_id, "unlink wishlists from this event")
    event_wishlists_table.delete_item(
        Key={"event_id": event_id, "wishlist_id": wishlist_id}
    )
    return {"success": True, "message": "Wishlist unlinked"}
