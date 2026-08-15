"""Notification processor: the consumer half of the notifications pipeline.

The API publishes an event to SQS and returns; this Lambda drains the queue and
writes the notification rows. It is the ONLY writer of the notifications table.
Doing the writes here (not on the request path) keeps a follow or a love fast
and lets a fan-out to many followers happen off the user's request.

Deployed as a plain zip of THIS FILE ONLY (see ../build.sh): boto3 ships with
the Lambda Python runtime, and this consumer has no other dependency, so there
is nothing to vendor.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource(
    "dynamodb", region_name=os.environ.get("AWS_REGION_NAME", "us-east-1")
)

# Required at cold start: a missing table name should fail the function loudly,
# not per-record. These three are every table the consumer touches.
notifications_table = dynamodb.Table(os.environ["NOTIFICATIONS_TABLE"])
notification_settings_table = dynamodb.Table(os.environ["NOTIFICATION_SETTINGS_TABLE"])
users_table = dynamodb.Table(os.environ["USERS_TABLE"])

# Notifications are reaped by the table's TTL 90 days after they're written; a
# feed that old is noise, and unbounded growth is cost. See infra/dynamodb.tf,
# which enables TTL on the `ttl` attribute this handler sets.
NOTIFICATION_TTL_DAYS = 90


def is_notification_muted(user_id: str, notification_type: str) -> bool:
    """Whether this user has muted this notification type. Reads their settings
    row and checks the f"mute_{notification_type}" flag: "follow" -> mute_follow,
    "wishlist_created" -> mute_wishlist_created, and so on. The settings model
    names its flags to match this derivation EXACTLY (singular mute_follow), so
    a muted type is genuinely suppressed. No settings row means nothing muted."""
    try:
        response = notification_settings_table.get_item(Key={"user_id": user_id})
        if "Item" not in response:
            return False
        return response["Item"].get(f"mute_{notification_type}", False)
    except Exception as e:
        # On a read error, default to NOT muted: a missed mute (one unwanted
        # notification) is friendlier than a missed notification.
        logger.error(f"Error reading mute settings for {user_id}: {e}")
        return False


def recipient_exists(user_id: str) -> bool:
    """Whether the recipient is still a live account. The producers captured
    these ids synchronously (a follower list, a wishlist owner), but this
    consumer runs later, after the SQS batching window and any redeliveries; a
    recipient can be deleted in that gap. Skip them rather than write a
    notification no one will ever read. A read error defaults to True so a
    transient DynamoDB blip doesn't silently drop real notifications."""
    try:
        response = users_table.get_item(Key={"id": user_id})
        item = response.get("Item")
        return bool(item) and not item.get("is_deleted", False)
    except Exception as e:
        logger.error(f"Error checking recipient {user_id}: {e}")
        return True


def create_notification(
    user_id: str,
    actor_id: str,
    notification_type: str,
    message: str,
    resource_id=None,
    resource_type=None,
) -> bool:
    """Write one notification row for one recipient, applying the rules that
    only make sense per-recipient: skip a muted type, skip notifying yourself,
    skip a recipient whose account is gone. Returns True only when a row was
    actually written."""
    if is_notification_muted(user_id, notification_type):
        logger.info(f"{notification_type} muted for {user_id}; skipping")
        return False
    if user_id == actor_id:
        logger.info(f"Skipping self-notification for {user_id}")
        return False
    if not recipient_exists(user_id):
        logger.info(f"Recipient {user_id} gone; skipping")
        return False

    try:
        now = datetime.now(timezone.utc)
        ttl = int((now + timedelta(days=NOTIFICATION_TTL_DAYS)).timestamp())
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "actor_id": actor_id,
            "notification_type": notification_type,
            "message": message,
            "read": False,
            "created_at": now.isoformat(),
            # Epoch seconds the table's TTL config reaps the row at (90 days out)
            "ttl": ttl,
        }
        if resource_id:
            notification["resource_id"] = resource_id
        if resource_type:
            notification["resource_type"] = resource_type

        notifications_table.put_item(Item=notification)
        logger.info(f"Created notification {notification['id']} for {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error creating notification for {user_id}: {e}")
        return False


def process_notification_event(event_data: dict) -> bool:
    """Fan one SQS event out to its recipients. The envelope always carries a
    user_ids list (a single-recipient producer wrapped its one id in a list).
    Returns True when the event is well-formed and processed; a malformed event
    with missing required fields returns False so the record is retried."""
    user_ids = event_data.get("user_ids", [])
    actor_id = event_data.get("actor_id")
    notification_type = event_data.get("notification_type")
    message = event_data.get("message")

    if not user_ids or not actor_id or not notification_type or not message:
        logger.error(f"Missing required fields in event: {event_data}")
        return False

    resource_id = event_data.get("resource_id")
    resource_type = event_data.get("resource_type")

    created = 0
    for user_id in user_ids:
        if create_notification(
            user_id=user_id,
            actor_id=actor_id,
            notification_type=notification_type,
            message=message,
            resource_id=resource_id,
            resource_type=resource_type,
        ):
            created += 1
    logger.info(f"Created {created} of {len(user_ids)} notifications")
    return True


def lambda_handler(event, context):
    """SQS entry point. Reports partial batch failures so ONLY the records that
    failed are redelivered — reprocessing a whole batch would duplicate the
    notifications the succeeded records already wrote. A record whose body can't
    be parsed is a poison message: it can never succeed, so it is logged and
    dropped (not reported) rather than redelivered forever."""
    records = event.get("Records", [])
    logger.info(f"Processing {len(records)} SQS message(s)")

    batch_item_failures = []
    for record in records:
        message_id = record.get("messageId")
        try:
            event_data = json.loads(record["body"])
        except json.JSONDecodeError as e:
            # Poison message: unparseable, so retrying is pointless. Drop it.
            logger.error(f"Dropping unparseable SQS message: {e}")
            continue
        try:
            if not process_notification_event(event_data):
                if message_id:
                    batch_item_failures.append({"itemIdentifier": message_id})
        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}")
            if message_id:
                batch_item_failures.append({"itemIdentifier": message_id})

    # An empty list acknowledges the whole batch; each itemIdentifier here is
    # redelivered on its own.
    return {"batchItemFailures": batch_item_failures}
