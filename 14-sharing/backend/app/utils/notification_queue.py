"""Publish notification events to SQS for the Lambda consumer to process.

The API never writes a notification directly. It drops an event on a queue and
returns; a Lambda drains the queue and does the fan-out writes. That keeps a
follow or a love fast (one SQS put, not N DynamoDB writes on the request path)
and it decouples the two: a slow or failing consumer never slows the action
that triggered it. These helpers are the publish side, and they are
best-effort by contract — a missing queue URL or an SQS error returns False,
never raises, so a notification that can't be enqueued still doesn't fail the
follow/love/create the user actually asked for.
"""
import json
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

# boto3 resolves credentials from the standard chain (App Runner instance role
# in the cloud, your profile locally). Constructing the client makes no network
# call, so this is safe at import even when no queue is configured.
sqs = boto3.client("sqs", region_name=settings.aws_region)


def publish_notification_event(
    user_ids: list[str],
    actor_id: str,
    notification_type: str,
    message: str,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None,
) -> bool:
    """Enqueue one event that fans out to every id in user_ids. The consumer
    applies the per-recipient mute and self-notification rules, so this side
    just publishes the envelope. resource_id/resource_type are the deep-link
    target (a wishlist, a wish, a user), omitted when there is nothing to link.

    Returns True on a successful send, False on a missing queue URL or any SQS
    error — the caller (a producer in notifications.py) is wrapped so this can
    never break the action that triggered the notification."""
    if not settings.notifications_queue_url:
        # No queue configured (local dev, tests): a no-op, not an error the
        # action should surface. Logged so a misconfigured deploy is visible.
        logger.warning("NOTIFICATIONS_QUEUE_URL not configured; skipping publish")
        return False

    message_body = {
        "user_ids": user_ids,
        "actor_id": actor_id,
        "notification_type": notification_type,
        "message": message,
    }
    if resource_id:
        message_body["resource_id"] = resource_id
    if resource_type:
        message_body["resource_type"] = resource_type

    try:
        response = sqs.send_message(
            QueueUrl=settings.notifications_queue_url,
            MessageBody=json.dumps(message_body),
        )
        logger.info(
            "Published %s notification for %d user(s): MessageId=%s",
            notification_type,
            len(user_ids),
            response["MessageId"],
        )
        return True
    except ClientError as e:
        logger.error(f"Failed to publish notification event to SQS: {e}")
        return False


def publish_single_notification_event(
    user_id: str,
    actor_id: str,
    notification_type: str,
    message: str,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None,
) -> bool:
    """Publish an event aimed at one recipient — a thin wrapper that wraps the
    id in the one-element list the envelope always carries, so the consumer has
    a single shape to read whether the event fanned out to one follower or a
    thousand."""
    return publish_notification_event(
        user_ids=[user_id],
        actor_id=actor_id,
        notification_type=notification_type,
        message=message,
        resource_id=resource_id,
        resource_type=resource_type,
    )
