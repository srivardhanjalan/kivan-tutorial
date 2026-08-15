"""Notification processor: the consumer half of the notifications pipeline.

The API publishes an event to SQS and returns; this Lambda drains the queue and
writes the notification rows. It is the ONLY writer of the notifications table.
Doing the writes here (not on the request path) keeps a follow or a love fast
and lets a fan-out to many followers happen off the user's request.

Step 12 adds the email leg: after a row is written, the consumer also mails the
recipient a copy via Mailgun. That is why the deploy zip is no longer just this
file: `requests` is vendored alongside it (see ../build.sh). boto3 still ships
with the Lambda Python runtime; only the pure-python `requests` is vendored.
"""
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import boto3
import requests

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

# Mailgun delivery config. The domain and from-address are not secret, so they
# ride in plain Lambda env vars. The API KEY is secret and is NOT: Lambda env
# vars are plaintext at rest, so the key is fetched from an SSM SecureString at
# cold start instead (see below), matching the SSM idiom the App Runner backend
# already uses for its Clerk/Firecrawl keys.
MAILGUN_DOMAIN = os.environ.get("MAILGUN_DOMAIN", "")
MAILGUN_FROM_EMAIL = os.environ.get("MAILGUN_FROM_EMAIL", "")


def _load_mailgun_api_key() -> str:
    """Fetch the Mailgun API key from SSM Parameter Store ONCE per cold start.

    Runs at import so the decrypted key is cached for the whole container's life
    rather than re-fetched per invocation. The parameter is a SecureString read
    with WithDecryption=True (the Lambda role's ssm:GetParameter grant, iam.tf).
    An unset MAILGUN_API_KEY_PARAM, an empty parameter, or any read error all
    return "", the not-configured state the send path treats as "skip email",
    never a crash: a mailer that can't reach its key must not take the queue
    consumer down with it."""
    param_name = os.environ.get("MAILGUN_API_KEY_PARAM", "")
    if not param_name:
        return ""
    try:
        ssm = boto3.client(
            "ssm", region_name=os.environ.get("AWS_REGION_NAME", "us-east-1")
        )
        response = ssm.get_parameter(Name=param_name, WithDecryption=True)
        return response["Parameter"]["Value"]
    except Exception as e:
        logger.error(f"Could not load Mailgun API key from SSM: {e}")
        return ""


# Resolved at cold start and cached for the container's lifetime.
MAILGUN_API_KEY = _load_mailgun_api_key()


def send_email_via_mailgun(to_email: str, subject: str, text_content: str) -> bool:
    """POST one message to Mailgun's REST API. Returns True only on a 200. Never
    raises: a missing config (any of key/domain/from unset) is the skip path,
    and a non-200 or a transport error is logged and swallowed: email is
    best-effort and must never fail the notification it accompanies."""
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN or not MAILGUN_FROM_EMAIL:
        logger.warning("Mailgun not configured, skipping email send")
        return False

    try:
        response = requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Kivan <{MAILGUN_FROM_EMAIL}>",
                "to": to_email,
                "subject": subject,
                "text": text_content,
            },
            timeout=10,
        )
        if response.status_code == 200:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        logger.error(f"Failed to send email: {response.status_code} {response.text}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def get_user_email(user_id: str) -> str | None:
    """The recipient's email from the users table, or None when there's no row,
    no email attribute, or a read error. Read here (not reused from the
    recipient-exists guard) so it only runs when we're actually about to mail:
    a muted or opted-out notification never touches the users table twice. Note
    the users key attribute is `id`, not `user_id`."""
    try:
        response = users_table.get_item(Key={"id": user_id})
        item = response.get("Item")
        return item.get("email") if item else None
    except Exception as e:
        logger.error(f"Error getting user email for {user_id}: {e}")
        return None


def get_notification_settings(user_id: str) -> dict:
    """Read a user's settings row ONCE, reused for every per-user decision this
    notification needs (which types they muted, whether they want email copies).
    Returns the item dict, or {} when there's no row or the read fails, so "no
    settings" and "unreadable settings" both mean nothing muted and email on
    (fail-open: a missed mute or an extra email beats a dropped notification)."""
    try:
        response = notification_settings_table.get_item(Key={"user_id": user_id})
        return response.get("Item", {})
    except Exception as e:
        logger.error(f"Error reading notification settings for {user_id}: {e}")
        return {}


def is_notification_muted(settings: dict, notification_type: str) -> bool:
    """Whether this user muted this type, read off their already-fetched settings
    row. Checks the f"mute_{notification_type}" flag: "follow" -> mute_follow,
    "wishlist_created" -> mute_wishlist_created, and so on. The settings model
    names its flags to match this derivation EXACTLY (singular mute_follow), so
    a muted type is genuinely suppressed. Empty settings ({}) mute nothing."""
    return settings.get(f"mute_{notification_type}", False)


def send_notification_email(
    user_id: str, settings: dict, notification_type: str, message: str
) -> bool:
    """Mail the recipient a copy of a notification we just wrote. Three gates,
    each with its own log line (the observable contract an E2E asserts on):
    email copies opted out, no email on file, or Mailgun not configured. The
    body is one generic template for every type (the type is shown as a label);
    there is no per-type copy."""
    if not settings.get("email_notifications", True):
        logger.info(f"Email notifications disabled for user {user_id}")
        return False

    user_email = get_user_email(user_id)
    if not user_email:
        logger.warning(f"No email found for user {user_id}")
        return False

    type_label = notification_type.replace("_", " ").title()
    subject = "You have a new notification on Kivan"
    text_content = (
        "Hi there,\n\n"
        "You have a new notification on Kivan:\n\n"
        f"{message}\n\n"
        f"Type: {type_label}\n\n"
        "Open the Kivan app to view your notification.\n\n"
        "Best regards,\n"
        "The Kivan Team\n"
    )
    return send_email_via_mailgun(user_email, subject, text_content)


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
    skip a recipient whose account is gone. On a successful write, also mail the
    recipient a copy (best-effort). Returns True only when a row was written."""
    settings = get_notification_settings(user_id)
    if is_notification_muted(settings, notification_type):
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

        # Email is a best-effort copy of a notification already persisted: a
        # Mailgun failure must never fail creation, so it's caught and only
        # logged. We reuse the settings row read above for the opt-in check.
        try:
            send_notification_email(user_id, settings, notification_type, message)
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

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
