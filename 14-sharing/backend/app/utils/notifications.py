"""The notification producers: one per social action that earns a notification.

Each producer composes the human message (using the actor's name), works out
who should hear about it, and hands an event to notification_queue for the
Lambda consumer to write. Two shapes: a direct notification to one user (a
follow, a love), a fan-out to every follower (a new wishlist, a new wish, a new
event), and a targeted fan-out to a chosen set (an event invitation).

Every producer is best-effort by contract, wrapped so a notification failure
never touches the action that triggered it — the call sites wrap them again,
belt and suspenders, because a follow must succeed even if the whole
notification path is down.
"""
import logging
from typing import Optional

from boto3.dynamodb.conditions import Key

from app.database import followers_table, users_table, wishlists_table
from app.utils.dynamo import query_all_pages
from app.utils.notification_queue import (
    publish_notification_event,
    publish_single_notification_event,
)

logger = logging.getLogger(__name__)


def _get_follower_ids(user_id: str) -> list[str]:
    """Every follower of a user, for a fan-out. FollowingIndex flips the follow
    edge so following_id is the partition key, turning "who follows X" into one
    Query; query_all_pages follows pagination to the end so a user with more
    than a page of followers still notifies all of them (the same discipline
    GET /users/{id}/followers uses)."""
    edges = query_all_pages(
        followers_table,
        IndexName="FollowingIndex",
        KeyConditionExpression=Key("following_id").eq(user_id),
    )
    return [edge["follower_id"] for edge in edges]


def _actor_name(actor_id: str) -> Optional[str]:
    """The display name to open a message with ("Ada Lovelace loved..."). Falls
    back to "Someone" when the actor has no name yet, and to None when the actor
    record is missing entirely — the caller treats None as "skip this
    notification", since a message with no author is noise."""
    response = users_table.get_item(Key={"id": actor_id})
    if "Item" not in response:
        logger.error(f"Actor {actor_id} not found; skipping notification")
        return None
    actor = response["Item"]
    name = f"{actor.get('first_name', '')} {actor.get('last_name', '')}".strip()
    return name or "Someone"


def notify_follow(actor_id: str, followed_user_id: str) -> None:
    """Someone followed you: a direct notification to the followed user. The
    resource is the actor (resource_type "user"), so the tap opens their
    profile."""
    try:
        actor_name = _actor_name(actor_id)
        if actor_name is None:
            return
        publish_single_notification_event(
            user_id=followed_user_id,
            actor_id=actor_id,
            notification_type="follow",
            message=f"{actor_name} started following you",
            resource_id=actor_id,
            resource_type="user",
        )
    except Exception as e:
        logger.error(f"Error creating follow notification: {e}")


def notify_wishlist_created(actor_id: str, wishlist_id: str, wishlist_name: str) -> None:
    """A user created a wishlist: fan out to their followers. Every wishlist is
    public this step, so we notify unconditionally; the source gates this on
    privacy_type == "public", but privacy lands in step 14, so there is no
    private wishlist to withhold yet."""
    try:
        actor_name = _actor_name(actor_id)
        if actor_name is None:
            return
        follower_ids = _get_follower_ids(actor_id)
        if follower_ids:
            publish_notification_event(
                user_ids=follower_ids,
                actor_id=actor_id,
                notification_type="wishlist_created",
                message=f"{actor_name} created a new wishlist: {wishlist_name}",
                resource_id=wishlist_id,
                resource_type="wishlist",
            )
    except Exception as e:
        logger.error(f"Error creating wishlist_created notifications: {e}")


def notify_wish_added(
    actor_id: str, wish_id: str, wish_name: str, wishlist_id: str
) -> None:
    """A user added a wish: fan out to their followers. Public-by-default the
    same way notify_wishlist_created is (privacy is step 14). wishlist_id rides
    along so the consumer can store it on the resource and the tap can open the
    wish inside its parent list."""
    try:
        actor_name = _actor_name(actor_id)
        if actor_name is None:
            return
        follower_ids = _get_follower_ids(actor_id)
        if follower_ids:
            publish_notification_event(
                user_ids=follower_ids,
                actor_id=actor_id,
                notification_type="wish_added",
                message=f"{actor_name} added a new wish: {wish_name}",
                resource_id=wish_id,
                resource_type="wish",
            )
    except Exception as e:
        logger.error(f"Error creating wish_added notifications: {e}")


def notify_event_created(actor_id: str, event_id: str, event_name: str) -> None:
    """A user created an event: fan out to their followers, the same shape as
    notify_wishlist_created. The event is the resource (resource_type "event"),
    so the tap opens its detail screen. Public/private gating is step 14's job;
    this step notifies unconditionally."""
    try:
        actor_name = _actor_name(actor_id)
        if actor_name is None:
            return
        follower_ids = _get_follower_ids(actor_id)
        if follower_ids:
            publish_notification_event(
                user_ids=follower_ids,
                actor_id=actor_id,
                notification_type="event_created",
                message=f"{actor_name} created a new event: {event_name}",
                resource_id=event_id,
                resource_type="event",
            )
    except Exception as e:
        logger.error(f"Error creating event_created notifications: {e}")


def notify_event_invitation(
    actor_id: str, event_id: str, event_name: str, invitee_ids: list[str]
) -> None:
    """A host invited people to an event: a targeted fan-out to the added USER
    invitees only. Email invitees are never passed here: they have no account
    to notify (an email invite is a bare DynamoDB row, claimed if that address
    ever signs up). The event is the resource, so the tap opens its detail
    screen."""
    try:
        actor_name = _actor_name(actor_id)
        if actor_name is None:
            return
        if invitee_ids:
            publish_notification_event(
                user_ids=invitee_ids,
                actor_id=actor_id,
                notification_type="event_invitation",
                message=f"{actor_name} invited you to an event: {event_name}",
                resource_id=event_id,
                resource_type="event",
            )
    except Exception as e:
        logger.error(f"Error creating event_invitation notifications: {e}")


def notify_wishlist_loved(actor_id: str, wishlist_id: str, owner_id: str) -> None:
    """Someone loved your wishlist: a direct notification to the owner. Reads
    the wishlist for its name (falling back to "your wishlist" if it is gone),
    then links the love back to that wishlist."""
    try:
        actor_name = _actor_name(actor_id)
        if actor_name is None:
            return
        response = wishlists_table.get_item(Key={"id": wishlist_id})
        if "Item" not in response:
            logger.error(f"Wishlist {wishlist_id} not found; skipping love notification")
            return
        wishlist_name = response["Item"].get("name", "your wishlist")
        publish_single_notification_event(
            user_id=owner_id,
            actor_id=actor_id,
            notification_type="wishlist_loved",
            message=f"{actor_name} loved your wishlist: {wishlist_name}",
            resource_id=wishlist_id,
            resource_type="wishlist",
        )
    except Exception as e:
        logger.error(f"Error creating wishlist_loved notification: {e}")
