"""
Step 12 — email notifications (PR #94 proof list).

The email leg rides the same Lambda consumer; its behaviour is observable in the
consumer's CloudWatch logs. The DEFAULT legs here assert the log contract that
holds WITHOUT Mailgun configured (a fresh minimal stack), plus the opt-out gate
which fires before any Mailgun check. The live-send leg runs only when
E2E_MAILGUN=1 (a stack deployed with a real Mailgun key + authorized recipient).
"""
import os
import time

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step12]

_MAILGUN_LIVE = bool(os.environ.get("E2E_MAILGUN"))


@pytest.fixture(scope="session")
def lambda_log_group(environment) -> str:
    return f"/aws/lambda/kivan-{environment}-notification-processor"


def _wait_for_log(logs_client, group, since_ms, needle, timeout=100):
    """Poll the consumer's log group until a line contains `needle`, or return
    None once timeout elapses (CloudWatch ingestion lags the action by seconds)."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        token = None
        while True:
            kwargs = {"logGroupName": group, "startTime": since_ms, "limit": 10000}
            if token:
                kwargs["nextToken"] = token
            try:
                resp = logs_client.filter_log_events(**kwargs)
            except logs_client.exceptions.ResourceNotFoundException:
                resp = {"events": []}
            for ev in resp.get("events", []):
                if needle in ev["message"]:
                    return ev["message"]
            token = resp.get("nextToken")
            if not token:
                break
        time.sleep(5)
    return None


def test_email_settings_round_trip(clerk_user):
    user = clerk_user("Ed", "Emailer")
    settings = user.client.get("/notifications/settings").json()
    assert settings["email_notifications"] is True  # opt-out model: default on

    off = user.client.put("/notifications/settings", json={"email_notifications": False})
    assert off.status_code == 200
    assert off.json()["email_notifications"] is False

    on = user.client.put("/notifications/settings", json={"email_notifications": True})
    assert on.status_code == 200
    assert on.json()["email_notifications"] is True


@pytest.mark.skipif(_MAILGUN_LIVE, reason="stack has Mailgun configured (E2E_MAILGUN=1)")
def test_mailgun_unconfigured_log_contract(clerk_user, logs_client, lambda_log_group):
    """With no Mailgun key, a delivered notification logs the skip line."""
    actor = clerk_user("Manny", "Mailer")
    recipient = clerk_user("Rae", "Recipient")
    since = int(time.time() * 1000) - 5000
    assert actor.client.post(f"/users/{recipient.user_id}/follow").status_code == 204

    line = _wait_for_log(logs_client, lambda_log_group, since,
                         "Mailgun not configured, skipping email send")
    assert line is not None, "expected the Mailgun-not-configured skip line"


def test_opt_out_suppresses_email_but_not_feed(clerk_user, poll, logs_client, lambda_log_group):
    """email_notifications=false logs the disabled line and sends no mail, but
    the in-app feed still receives the row — opt-out is email-only."""
    actor = clerk_user("Otto", "Opter")
    recipient = clerk_user("Ola", "Optout")
    assert recipient.client.put("/notifications/settings",
                                json={"email_notifications": False}).status_code == 200

    since = int(time.time() * 1000) - 5000
    assert actor.client.post(f"/users/{recipient.user_id}/follow").status_code == 204

    # In-app feed still gets the follow row.
    feed = poll(lambda: recipient.client.get("/notifications/me").json(),
                until=lambda f: any(n["notification_type"] == "follow"
                                    and n["actor"]["id"] == actor.user_id
                                    for n in f["notifications"]))
    assert any(n["notification_type"] == "follow" and n["actor"]["id"] == actor.user_id
               for n in feed["notifications"])

    line = _wait_for_log(logs_client, lambda_log_group, since,
                         f"Email notifications disabled for user {recipient.user_id}")
    assert line is not None, "expected the email-disabled opt-out line"


@pytest.mark.skipif(not _MAILGUN_LIVE, reason="live send needs E2E_MAILGUN=1 + a Mailgun-configured stack")
def test_live_send_logs_success(clerk_user, logs_client, lambda_log_group):
    """On a Mailgun-configured stack a delivered notification logs the success
    line (which only prints on a Mailgun HTTP 200)."""
    actor = clerk_user("Liv", "Live")
    recipient = clerk_user("Sam", "Send")
    since = int(time.time() * 1000) - 5000
    assert actor.client.post(f"/users/{recipient.user_id}/follow").status_code == 204

    line = _wait_for_log(logs_client, lambda_log_group, since, "Email sent successfully to")
    assert line is not None, "expected a Mailgun success line"
