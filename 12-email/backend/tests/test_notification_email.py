"""The Lambda's email leg (step 12), exercised without any network.

The notification processor imports at cold start: it binds its DynamoDB tables
and fetches the Mailgun key from SSM the moment the module loads. So each test
loads a FRESH copy of the handler inside its own moto backend, with the env it
wants to prove (Mailgun configured or not). `requests.post` is monkeypatched, so
no email ever leaves the process; the tests assert the send DECISION and, when a
send happens, the exact URL/auth/recipient handed to Mailgun.
"""
import importlib
import os
import sys
from contextlib import contextmanager

import boto3
import pytest
from moto import mock_aws

# tests/ -> backend/ -> 12-email/ -> lambda/notification_processor.
_LAMBDA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "lambda",
    "notification_processor",
)

NOTIFICATIONS_TABLE = "kivan-test-notifications"
NOTIFICATION_SETTINGS_TABLE = "kivan-test-notification-settings"
USERS_TABLE = "kivan-test-users"
MAILGUN_PARAM = "/kivan/test/mailgun-api-key"


def _create_lambda_tables(client) -> None:
    """The three tables the handler touches: notifications (its writes),
    notification settings (mutes + email opt-in), users (recipient email)."""
    client.create_table(
        TableName=NOTIFICATIONS_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
    )
    client.create_table(
        TableName=NOTIFICATION_SETTINGS_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[{"AttributeName": "user_id", "AttributeType": "S"}],
        KeySchema=[{"AttributeName": "user_id", "KeyType": "HASH"}],
    )
    client.create_table(
        TableName=USERS_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
    )


@pytest.fixture
def load_handler(monkeypatch):
    """Factory: `with load_handler(mailgun_configured=...) as (h, res):` yields a
    freshly-imported handler bound to a fresh moto backend and the given Mailgun
    config, plus the DynamoDB resource for seeding rows."""

    @contextmanager
    def _load(*, mailgun_configured: bool):
        with mock_aws():
            ddb = boto3.client("dynamodb", region_name="us-east-1")
            _create_lambda_tables(ddb)

            monkeypatch.setenv("NOTIFICATIONS_TABLE", NOTIFICATIONS_TABLE)
            monkeypatch.setenv(
                "NOTIFICATION_SETTINGS_TABLE", NOTIFICATION_SETTINGS_TABLE
            )
            monkeypatch.setenv("USERS_TABLE", USERS_TABLE)
            monkeypatch.setenv("AWS_REGION_NAME", "us-east-1")

            if mailgun_configured:
                boto3.client("ssm", region_name="us-east-1").put_parameter(
                    Name=MAILGUN_PARAM, Value="key-abc", Type="SecureString"
                )
                monkeypatch.setenv("MAILGUN_API_KEY_PARAM", MAILGUN_PARAM)
                monkeypatch.setenv("MAILGUN_DOMAIN", "mg.example.com")
                monkeypatch.setenv("MAILGUN_FROM_EMAIL", "notifications@mg.example.com")
            else:
                for var in (
                    "MAILGUN_API_KEY_PARAM",
                    "MAILGUN_DOMAIN",
                    "MAILGUN_FROM_EMAIL",
                ):
                    monkeypatch.delenv(var, raising=False)

            sys.path.insert(0, _LAMBDA_DIR)
            sys.modules.pop("handler", None)
            handler = importlib.import_module("handler")
            resource = boto3.resource("dynamodb", region_name="us-east-1")
            try:
                yield handler, resource
            finally:
                sys.modules.pop("handler", None)
                if _LAMBDA_DIR in sys.path:
                    sys.path.remove(_LAMBDA_DIR)

    return _load


class _FakeResponse:
    def __init__(self, status_code):
        self.status_code = status_code
        self.text = ""


def _seed(res, *, email, email_notifications=None):
    """Seed a recipient (id `u1`) with an email, and optionally a settings row
    carrying the email opt-in flag."""
    if email is not None:
        res.Table(USERS_TABLE).put_item(Item={"id": "u1", "email": email})
    if email_notifications is not None:
        res.Table(NOTIFICATION_SETTINGS_TABLE).put_item(
            Item={"user_id": "u1", "email_notifications": email_notifications}
        )


def test_opt_out_sends_no_email(load_handler, monkeypatch):
    """email_notifications=False: the notification row is still written, but the
    opt-out gate fires before any Mailgun call."""
    with load_handler(mailgun_configured=True) as (handler, res):
        _seed(res, email="u1@example.com", email_notifications=False)
        calls = []
        monkeypatch.setattr(handler.requests, "post", lambda *a, **k: calls.append((a, k)))

        created = handler.create_notification("u1", "actor", "follow", "hi")

        assert created is True  # email opt-out never fails creation
        assert calls == []  # no send attempted


def test_opt_in_configured_sends_email(load_handler, monkeypatch):
    """Opt-in (no settings row = default on), an email on file, and Mailgun
    configured: exactly one POST, to Mailgun's messages URL, basic-auth `api`
    with the SSM-fetched key, addressed to the recipient."""
    with load_handler(mailgun_configured=True) as (handler, res):
        _seed(res, email="u1@example.com")  # no settings row -> default opt-in
        calls = []

        def fake_post(url, **kwargs):
            calls.append((url, kwargs))
            return _FakeResponse(200)

        monkeypatch.setattr(handler.requests, "post", fake_post)

        handler.create_notification("u1", "actor", "follow", "hi")

        assert len(calls) == 1
        url, kwargs = calls[0]
        assert url == "https://api.mailgun.net/v3/mg.example.com/messages"
        assert kwargs["auth"] == ("api", "key-abc")
        assert kwargs["data"]["to"] == "u1@example.com"


def test_unconfigured_skips_send(load_handler, monkeypatch):
    """Mailgun unset (blank key): the send guard short-circuits, so the row is
    written but no POST is made: the leg is off until a key is supplied."""
    with load_handler(mailgun_configured=False) as (handler, res):
        _seed(res, email="u1@example.com")
        calls = []
        monkeypatch.setattr(handler.requests, "post", lambda *a, **k: calls.append((a, k)))

        created = handler.create_notification("u1", "actor", "follow", "hi")

        assert created is True
        assert calls == []
