"""The read/manage side of notifications: the feed, the unread badge, marking
read, deleting, and the mute settings. The WRITE side is asynchronous (a
producer publishes to SQS, the Lambda consumer writes the row); these routes
only read what the consumer wrote and let a user act on it.
"""
import logging

from boto3.dynamodb.conditions import Attr, Key
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import (
    notification_settings_table,
    notifications_table,
    users_table,
    wishes_table,
    wishlists_table,
)
from app.dependencies.auth import get_current_user_id
from app.models.notifications import (
    MarkReadResponse,
    NotificationSettings,
    NotificationSettingsUpdate,
    NotificationsResponse,
    NotificationWithActor,
    UnreadCountResponse,
)
from app.utils.dynamo import batch_get_items, query_all_pages
from app.utils.timestamps import utc_now_iso

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# A notification's resource_type maps to the table that holds its display
# record. The tap-through targets this step covers: a follow/love opens a user
# or wishlist, a new wish opens the wish.
_RESOURCE_TABLES = {
    "wishlist": wishlists_table,
    "wish": wishes_table,
    "user": users_table,
}

# The four mute flags a user can toggle, in one place so the GET default and the
# PUT update expression can't drift apart. Each name matches the Lambda
# consumer's f"mute_{notification_type}" derivation exactly.
_MUTE_FIELDS = (
    "mute_follow",
    "mute_wishlist_created",
    "mute_wish_added",
    "mute_wishlist_loved",
)


def _enrich_actors(actor_ids: list[str]) -> dict:
    """Resolve a page's actor ids to user records in one BatchGetItem — the N+1
    fix for a feed that would otherwise GetItem once per row. Deduped because
    BatchGetItem rejects duplicate keys, and returned as an {id: item} map the
    caller rebuilds row order from."""
    unique_ids = list(dict.fromkeys(actor_ids))
    if not unique_ids:
        return {}
    return {
        item["id"]: item
        for item in batch_get_items(users_table, [{"id": uid} for uid in unique_ids])
    }


def _enrich_resources(resource_refs: list[tuple[str, str]]) -> dict:
    """Resolve each (resource_type, resource_id) a page references to a small
    display dict, one BatchGetItem per type. Keyed by the (type, id) pair so a
    row looks its own resource up directly; a missing resource is simply absent
    (a wishlist deleted after the notification fired drops its link, it doesn't
    error the feed)."""
    ids_by_type: dict[str, set] = {}
    for resource_type, resource_id in resource_refs:
        if resource_type in _RESOURCE_TABLES:
            ids_by_type.setdefault(resource_type, set()).add(resource_id)

    details: dict[tuple[str, str], dict] = {}
    for resource_type, resource_ids in ids_by_type.items():
        items = batch_get_items(
            _RESOURCE_TABLES[resource_type],
            [{"id": rid} for rid in resource_ids],
        )
        for item in items:
            if resource_type == "user":
                name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip()
                name = name or "Someone"
            else:
                name = item.get("name", "Unknown")
            resource = {"id": item["id"], "type": resource_type, "name": name}
            # A wish links to its parent list so the tap can open the wish
            # INSIDE that list — without wishlist_id the client only has the
            # wish id and no route to the screen that shows it.
            if resource_type == "wish":
                resource["wishlist_id"] = item.get("wishlist_id")
            details[(resource_type, item["id"])] = resource
    return details


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop. Literal paths (/unread-count, /settings) are
# declared before /{notification_id} so they are never read as an id.
@router.get("/me", response_model=NotificationsResponse)
def get_my_notifications(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = False,
    user_id: str = Depends(get_current_user_id),
):
    """The caller's notifications, newest first. Reads the whole set off
    UserNotificationsIndex (ScanIndexForward=False), so total and unread_count
    cover everything, then slices the requested page in memory. A page's actors
    and resources are enriched in one batch each; a row whose actor no longer
    exists is dropped rather than shown authorless."""
    query_kwargs: dict = {
        "IndexName": "UserNotificationsIndex",
        "KeyConditionExpression": Key("user_id").eq(user_id),
        "ScanIndexForward": False,  # newest first (created_at descending)
    }
    if unread_only:
        query_kwargs["FilterExpression"] = Attr("read").eq(False)

    all_notifications = query_all_pages(notifications_table, **query_kwargs)
    total = len(all_notifications)
    unread_count = sum(1 for n in all_notifications if not n.get("read", False))

    page = all_notifications[offset:offset + limit]
    has_more = (offset + limit) < total

    actors = _enrich_actors([n["actor_id"] for n in page])
    resources = _enrich_resources(
        [
            (n["resource_type"], n["resource_id"])
            for n in page
            if n.get("resource_id") and n.get("resource_type")
        ]
    )

    enriched: list[NotificationWithActor] = []
    for n in page:
        actor = actors.get(n["actor_id"])
        if actor is None:
            # Actor deleted since the notification fired: an authorless row is
            # noise, so skip it (it still counts toward total/unread above).
            continue
        enriched.append(
            NotificationWithActor(
                id=n["id"],
                actor=actor,
                notification_type=n["notification_type"],
                message=n["message"],
                resource=resources.get((n.get("resource_type"), n.get("resource_id"))),
                read=n.get("read", False),
                created_at=n["created_at"],
            )
        )

    return NotificationsResponse(
        notifications=enriched,
        total=total,
        unread_count=unread_count,
        has_more=has_more,
        next_offset=offset + limit if has_more else None,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(user_id: str = Depends(get_current_user_id)):
    """The unread badge count. Best-effort by design: the badge polls this often
    and a transient read error should show a stale/zero count, never surface an
    error to the user, so any failure returns 0 rather than a 500."""
    try:
        items = query_all_pages(
            notifications_table,
            IndexName="UserNotificationsIndex",
            KeyConditionExpression=Key("user_id").eq(user_id),
            FilterExpression=Attr("read").eq(False),
        )
        return UnreadCountResponse(unread_count=len(items))
    except Exception as e:
        logger.error(f"Error counting unread notifications for {user_id}: {e}")
        return UnreadCountResponse(unread_count=0)


@router.get("/settings", response_model=NotificationSettings)
def get_notification_settings(user_id: str = Depends(get_current_user_id)):
    """The caller's mute preferences, defaulting to nothing muted for a user who
    never opened the screen (no row yet)."""
    response = notification_settings_table.get_item(Key={"user_id": user_id})
    if "Item" in response:
        return NotificationSettings(**response["Item"])
    return NotificationSettings(user_id=user_id, updated_at=utc_now_iso())


@router.put("/settings", response_model=NotificationSettings)
def update_notification_settings(
    update: NotificationSettingsUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Toggle any subset of the mute flags. Builds the SET clause from only the
    flags the body carried (an omitted flag is left as-is), always stamping
    updated_at. update_item is an upsert, so a user's first save creates the row
    with just the flags they touched; the model fills the rest with False."""
    now = utc_now_iso()
    update_parts = ["updated_at = :updated_at"]
    values: dict = {":updated_at": now}
    for field in _MUTE_FIELDS:
        value = getattr(update, field)
        if value is not None:
            update_parts.append(f"{field} = :{field}")
            values[f":{field}"] = value

    notification_settings_table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET " + ", ".join(update_parts),
        ExpressionAttributeValues=values,
    )
    updated = notification_settings_table.get_item(Key={"user_id": user_id})
    return NotificationSettings(**updated["Item"])


@router.put("/read-all", response_model=MarkReadResponse)
def mark_all_read(user_id: str = Depends(get_current_user_id)):
    """Mark every unread notification read — the "clear the badge" action. Reads
    the unread set off the GSI and flips each; already-read rows are filtered
    out so this only writes what it must."""
    unread = query_all_pages(
        notifications_table,
        IndexName="UserNotificationsIndex",
        KeyConditionExpression=Key("user_id").eq(user_id),
        FilterExpression=Attr("read").eq(False),
    )
    for n in unread:
        _set_read(n["id"])
    return MarkReadResponse(
        success=True, message=f"Marked {len(unread)} notification(s) as read"
    )


@router.put("/{notification_id}/read", response_model=MarkReadResponse)
def mark_notification_read(
    notification_id: str, user_id: str = Depends(get_current_user_id)
):
    """Mark one notification read. 404 if it doesn't exist, 403 if it isn't the
    caller's — a notification is private to its recipient."""
    _get_owned_notification(notification_id, user_id)
    _set_read(notification_id)
    return MarkReadResponse(success=True, message="Notification marked as read")


@router.delete("/{notification_id}", response_model=MarkReadResponse)
def delete_notification(
    notification_id: str, user_id: str = Depends(get_current_user_id)
):
    """Delete one notification. Same ownership rules as marking read: 404 if
    missing, 403 if it isn't the caller's."""
    _get_owned_notification(notification_id, user_id)
    notifications_table.delete_item(Key={"id": notification_id})
    return MarkReadResponse(success=True, message="Notification deleted")


def _get_owned_notification(notification_id: str, user_id: str) -> dict:
    """Fetch a notification and enforce that it belongs to the caller: 404 if it
    doesn't exist, 403 if it's someone else's. The one spelling both the
    mark-read and delete routes funnel through."""
    response = notifications_table.get_item(Key={"id": notification_id})
    if "Item" not in response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    notification = response["Item"]
    if notification["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this notification",
        )
    return notification


def _set_read(notification_id: str) -> None:
    """Flip a notification's `read` flag to True. `read` is a DynamoDB reserved
    word, so it's aliased."""
    notifications_table.update_item(
        Key={"id": notification_id},
        UpdateExpression="SET #read = :true",
        ExpressionAttributeNames={"#read": "read"},
        ExpressionAttributeValues={":true": True},
    )
