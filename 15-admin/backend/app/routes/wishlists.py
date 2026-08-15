import logging
import uuid

from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import users_table, wishlist_owners_table, wishlists_table
from app.dependencies.auth import get_current_user_id
from app.models.users import User
from app.models.wishlists import (
    ActionResponse,
    Wishlist,
    WishlistCreate,
    WishlistOwnerCreate,
    WishlistUpdate,
)
from app.utils.notifications import notify_wishlist_created
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
)
from app.utils.dynamo import (
    batch_get_items,
    get_item_or_404,
    query_all_pages,
    update_item_fields,
)
from app.utils.timestamps import utc_now_iso
from app.utils.wishlist_access import (
    check_wishlist_access,
    delete_wishlist_and_contents,
    get_wishlist_or_404,
    is_wishlist_owner,
    wishlist_is_public,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


# ── Owner-edge helpers ───────────────────────────────────────────────────────
# One row per owner, keyed (wishlist_id, user_id); the creator and every
# co-owner has one. is_wishlist_owner (in wishlist_access) reads the edge; these
# write it. Shaped exactly like event_hosts: a flat, role-less set where owning
# is the sole write credential.


def _put_owner(wishlist_id: str, user_id: str, *, added_by: str, added_at: str) -> None:
    """Write one owner edge. added_by/added_at record who granted ownership and
    when (the creator on a create, whichever owner ran POST /owners later)."""
    wishlist_owners_table.put_item(
        Item={
            "wishlist_id": wishlist_id,
            "user_id": user_id,
            "added_at": added_at,
            "added_by": added_by,
        }
    )


def _seed_additional_owners(
    wishlist_id: str, owner_ids, *, added_by: str, added_at: str
) -> None:
    """Write owner rows for the co-owners named at creation. Deduped (keeping
    order), the creator dropped (already an owner), and each remaining id
    validated against the users table in one BatchGetItem; an unknown id is
    skipped, never a 422 on someone else's typo."""
    if not owner_ids:
        return
    extra_ids = [oid for oid in dict.fromkeys(owner_ids) if oid != added_by]
    if not extra_ids:
        return
    known = {
        item["id"]
        for item in batch_get_items(users_table, [{"id": oid} for oid in extra_ids])
    }
    for oid in extra_ids:
        if oid in known:
            _put_owner(wishlist_id, oid, added_by=added_by, added_at=added_at)


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@router.post("/", response_model=Wishlist, status_code=status.HTTP_201_CREATED)
def create_wishlist(
    wishlist: WishlistCreate, user_id: str = Depends(get_current_user_id)
):
    """Create a wishlist owned by the caller. Same photo discipline as the
    PUT routes: store the planned permanent URL, write, and only then claim
    the pending object — a failed write must never leave a promoted object
    no record references (nothing reaps the permanent keyspace).

    Accepted window: unlike the users-table writes, this create has no
    table-level deleted-account guard (a DynamoDB condition can't reach
    across to the users table). A token minted just before account deletion
    could, on an instance whose known-ids cache never saw the deletion,
    create one orphaned wishlist after the sweep ran. The exposure is one
    token lifetime (about a minute); every other collections write 404s
    post-sweep because its target is already gone. Guarding it would cost a
    users-table read on every request — the cache's whole reason to exist.
    """
    stored = to_claim = None
    if wishlist.image_url is not None:
        # No prior object on a create, so plan against None: nothing to delete
        stored, to_claim, _ = plan_photo_update(wishlist.image_url, None, user_id)
    now = utc_now_iso()
    item = {
        "id": str(uuid.uuid4()),
        "name": wishlist.name,
        "image_url": stored,
        "life_event_id": wishlist.life_event_id,
        "privacy_type": wishlist.privacy_type,
        "created_by": user_id,
        "created_at": now,
        # The denormalized love tally starts at zero (step 10); adjust_count
        # moves it on love/unlove. entity_type is the constant partition key
        # PopularWishlistsIndex ranks under, so a new wishlist joins the rail.
        "love_count": 0,
        "entity_type": "WISHLIST",
    }
    wishlists_table.put_item(Item=item)

    # The creator is auto-inserted as the first owner: the invariant later owner
    # removals defend (a wishlist can't lose its last owner). Ownership lives in
    # the join table, never on the wishlist row; the same shape event create
    # uses for its auto-host.
    _put_owner(item["id"], user_id, added_by=user_id, added_at=now)
    _seed_additional_owners(item["id"], wishlist.owner_ids, added_by=user_id, added_at=now)

    if to_claim:
        claim_pending_photo(to_claim)

    # Fan the new wishlist out to the owner's followers, best-effort: a
    # notification failure must never fail the create the user asked for. The
    # privacy gate lives INSIDE notify_wishlist_created (a private wishlist fans
    # out to no one), so there's no guard to write, or forget, here.
    try:
        notify_wishlist_created(
            actor_id=user_id, wishlist_id=item["id"], wishlist_name=item["name"]
        )
    except Exception as notif_error:
        logger.error(f"Failed to publish wishlist_created notifications: {notif_error}")
    return item


@router.get("/me", response_model=list[Wishlist])
def get_my_wishlists(user_id: str = Depends(get_current_user_id)):
    """The caller's wishlists, newest first. A Query on CreatedByIndex, never a
    Scan; the GSI has no range key, so created_at DESC is applied here (ISO
    timestamps sort lexically = chronologically)."""
    items = query_all_pages(
        wishlists_table,
        IndexName="CreatedByIndex",
        KeyConditionExpression=Key("created_by").eq(user_id),
    )
    items.sort(key=lambda w: w["created_at"], reverse=True)
    return items


@router.get("/popular", response_model=list[Wishlist])
def get_popular_wishlists(
    limit: int = Query(default=10, ge=1, le=50),
    _user_id: str = Depends(get_current_user_id),
):
    """Discover's "wishlists to love" rail: the most-loved PUBLIC wishlists. A
    Query on PopularWishlistsIndex in descending love_count order: a private
    wishlist is visible to its owners, never on a discovery feed, so public-only
    is filtered here (privacy_type isn't an index key). The filter runs before
    the `limit` cap, so a private list high on the love ranking doesn't crowd a
    public one off the short preview. Declared before /{wishlist_id} so
    "popular" is never read as a wishlist id."""
    ranked = query_all_pages(
        wishlists_table,
        IndexName="PopularWishlistsIndex",
        KeyConditionExpression=Key("entity_type").eq("WISHLIST"),
        ScanIndexForward=False,  # highest love_count first
    )
    return [w for w in ranked if wishlist_is_public(w)][:limit]


@router.get("/{wishlist_id}", response_model=Wishlist)
def get_wishlist(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """A single wishlist: 404 if missing, then the view branch of the one gate.
    A public wishlist is readable by any signed-in user (a friend's collection
    off their profile, one you're about to love); a private one only by its
    owners and co-owners (a non-owner viewer is a 403). Editing it still requires
    ownership."""
    return check_wishlist_access(wishlist_id, user_id)


@router.put("/{wishlist_id}", response_model=Wishlist)
def update_wishlist(
    wishlist_id: str,
    update: WishlistUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update only the fields the body carries — exclude_unset means an omitted
    field is left untouched. The write is field-scoped and guarded (see
    update_item_fields) — never a full-item rewrite from a stale read. The
    photo swap follows the same key-based discipline as PUT /users/me: plan
    the change, write, then run the S3 claim/delete only after the write
    commits. Any owner or co-owner may edit, the same one gate the wishes
    mutations use, just with require_edit."""
    wishlist = check_wishlist_access(wishlist_id, user_id, require_edit=True)
    update_data = update.model_dump(exclude_unset=True)

    to_claim = to_delete = None
    changes: dict = {}
    # name and life_event_id are non-nullable: a present-but-None value is
    # ignored, never stored — a wishlist always keeps a name and a life-event
    # id. (Nothing on a wishlist clears via null this step.)
    if update_data.get("name") is not None:
        changes["name"] = update_data["name"]
    if update_data.get("life_event_id") is not None:
        changes["life_event_id"] = update_data["life_event_id"]
    # privacy_type is non-nullable too (a present-but-None is ignored); a real
    # value flips the wishlist between public and private. The Literal already
    # 422'd anything outside the two-value set at the boundary.
    if update_data.get("privacy_type") is not None:
        changes["privacy_type"] = update_data["privacy_type"]
    # image_url: a new non-None value swaps the photo; image_url:null is ignored
    # — removing a photo isn't a step-07 flow.
    if update_data.get("image_url") is not None:
        stored, to_claim, to_delete = plan_photo_update(
            update_data["image_url"], wishlist.get("image_url"), user_id
        )
        if stored is not None:
            changes["image_url"] = stored

    if not changes:
        return wishlist
    updated = update_item_fields(
        wishlists_table, {"id": wishlist_id}, changes, "Wishlist not found"
    )

    if to_claim:
        claim_pending_photo(to_claim)
    if to_delete:
        delete_photo_by_url(to_delete)
    return updated


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wishlist(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete the wishlist, its wishes, its owner edges, and every photo they
    uploaded. Owner-or-co-owner only: deleting is how a lone owner tears the
    whole thing down (the last-owner guard only blocks removing an owner, not
    this)."""
    wishlist = check_wishlist_access(wishlist_id, user_id, require_edit=True)
    delete_wishlist_and_contents(wishlist)


# ── Owner management ─────────────────────────────────────────────────────────
# Co-owners are a flat set: every owner can edit, delete, and add or remove
# owners. The one invariant is that a wishlist can't lose its last owner. A
# co-owner is added directly, with no invite/accept step, the same direct-grant
# model as event co-hosts.


@router.get("/{wishlist_id}/owners", response_model=list[User])
def get_wishlist_owners(
    wishlist_id: str, user_id: str = Depends(get_current_user_id)
):
    """The owner User records for a wishlist (creator + co-owners), in query
    order. A view read: anyone who can see the wishlist can see who owns it. One
    Query for the owner edges, one BatchGetItem to resolve their ids (mirrors
    get_event_hosts); an owner whose account is gone is skipped."""
    check_wishlist_access(wishlist_id, user_id)
    owners = query_all_pages(
        wishlist_owners_table,
        KeyConditionExpression=Key("wishlist_id").eq(wishlist_id),
    )
    owner_ids = [owner["user_id"] for owner in owners]
    users_map = {
        item["id"]: item
        for item in batch_get_items(users_table, [{"id": uid} for uid in owner_ids])
    }
    return [users_map[uid] for uid in owner_ids if uid in users_map]


@router.post("/{wishlist_id}/owners", response_model=ActionResponse)
def add_wishlist_owner(
    wishlist_id: str,
    owner: WishlistOwnerCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Promote a user to co-owner. Owner-only. 404 if the wishlist or the user
    to add doesn't exist, 400 if they already own it. The added user becomes a
    full owner immediately."""
    get_wishlist_or_404(wishlist_id)
    if not is_wishlist_owner(wishlist_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can add owners",
        )
    get_item_or_404(users_table, owner.user_id, "User not found")
    if is_wishlist_owner(wishlist_id, owner.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That user is already an owner of this wishlist",
        )
    _put_owner(wishlist_id, owner.user_id, added_by=user_id, added_at=utc_now_iso())
    return {"success": True, "message": "Owner added"}


@router.delete("/{wishlist_id}/owners/{owner_id}", response_model=ActionResponse)
def remove_wishlist_owner(
    wishlist_id: str,
    owner_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Remove a co-owner. Owner-only. 400 if it would leave the wishlist
    ownerless: a wishlist always keeps at least one owner (deleting the wishlist
    is how a lone owner tears the whole thing down)."""
    get_wishlist_or_404(wishlist_id)
    if not is_wishlist_owner(wishlist_id, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can remove owners",
        )
    owners = query_all_pages(
        wishlist_owners_table,
        KeyConditionExpression=Key("wishlist_id").eq(wishlist_id),
    )
    if len(owners) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last owner of a wishlist",
        )
    wishlist_owners_table.delete_item(
        Key={"wishlist_id": wishlist_id, "user_id": owner_id}
    )
    return {"success": True, "message": "Owner removed"}
