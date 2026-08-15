"""Event notification producers (step 13, phase C): the two event types wired
into the real routes.

A producer publishes one SQS envelope via publish_notification_event and
returns; these tests monkeypatch that publisher to capture the envelope, so they
prove the WIRING: the right recipients (fan-out vs targeted, user invitees
only), the right type, the event as the resource, without a live queue. moto
backs the DynamoDB reads the producers make (followers, users).
"""
import app.utils.notifications as notifications
from conftest import FOLLOWERS_TABLE, put_user


def _capture_publishes(monkeypatch) -> list[dict]:
    """Replace the SQS publisher with a capture, returning the list its calls
    land in. Patched on the notifications module, where both producers reference
    it as a module global."""
    calls: list[dict] = []
    monkeypatch.setattr(
        notifications,
        "publish_notification_event",
        lambda **kwargs: calls.append(kwargs) or True,
    )
    return calls


def _follow(aws, follower_id: str, following_id: str) -> None:
    """Seed a follow edge (follower_id follows following_id). FollowingIndex,
    which the fan-out reads, projects the keys, so the bare edge is enough."""
    aws.Table(FOLLOWERS_TABLE).put_item(
        Item={"follower_id": follower_id, "following_id": following_id}
    )


def _of_type(calls: list[dict], notification_type: str) -> list[dict]:
    return [c for c in calls if c["notification_type"] == notification_type]


def test_event_created_fans_out_to_followers(client, aws, monkeypatch):
    """Creating an event fans event_created out to every follower of the
    creator, with the event as the resource so the tap opens its detail."""
    put_user(aws, "host", first_name="Ada")
    put_user(aws, "f1")
    put_user(aws, "f2")
    _follow(aws, "f1", "host")
    _follow(aws, "f2", "host")
    calls = _capture_publishes(monkeypatch)

    resp = client("host").post("/events/", json={"name": "Gala"})
    assert resp.status_code == 201
    event_id = resp.json()["id"]

    created = _of_type(calls, "event_created")
    assert len(created) == 1
    envelope = created[0]
    assert set(envelope["user_ids"]) == {"f1", "f2"}
    assert envelope["actor_id"] == "host"
    assert envelope["resource_id"] == event_id
    assert envelope["resource_type"] == "event"
    assert "Gala" in envelope["message"]


def test_event_created_with_no_followers_publishes_nothing(client, aws, monkeypatch):
    """No followers, no envelope: the producer only publishes when there is
    someone to reach."""
    put_user(aws, "host", first_name="Ada")
    calls = _capture_publishes(monkeypatch)

    resp = client("host").post("/events/", json={"name": "Gala"})
    assert resp.status_code == 201
    assert _of_type(calls, "event_created") == []


def test_create_time_invitation_targets_user_invitees_only(client, aws, monkeypatch):
    """Create-time invites notify only the USER invitees; the email invitee is
    written but never notified (no account to reach)."""
    put_user(aws, "host", first_name="Ada")
    put_user(aws, "u2")
    calls = _capture_publishes(monkeypatch)

    resp = client("host").post(
        "/events/",
        json={
            "name": "Gala",
            "invitee_ids": ["u2"],
            "invitee_emails": ["stranger@example.com"],
        },
    )
    assert resp.status_code == 201
    event_id = resp.json()["id"]

    invites = _of_type(calls, "event_invitation")
    assert len(invites) == 1
    envelope = invites[0]
    assert envelope["user_ids"] == ["u2"]  # the email invitee is NOT notified
    assert envelope["actor_id"] == "host"
    assert envelope["resource_id"] == event_id
    assert envelope["resource_type"] == "event"
    assert "Gala" in envelope["message"]


def test_add_later_invitation_fires_from_the_same_helper(client, aws, monkeypatch):
    """The add-later route reuses the shared helper, so it notifies the new user
    invitees exactly as create-time does, again skipping the email invitee."""
    put_user(aws, "host", first_name="Ada")
    put_user(aws, "u2")
    event_id = client("host").post("/events/", json={"name": "Gala"}).json()["id"]

    calls = _capture_publishes(monkeypatch)  # capture only the add-later leg
    resp = client("host").post(
        f"/events/{event_id}/invitees",
        json={"invitee_ids": ["u2"], "invitee_emails": ["e@example.com"]},
    )
    assert resp.status_code == 200

    invites = _of_type(calls, "event_invitation")
    assert len(invites) == 1
    assert invites[0]["user_ids"] == ["u2"]
    assert invites[0]["resource_id"] == event_id


def test_reinvite_is_idempotent_and_silent(client, aws, monkeypatch):
    """Only NEWLY written invitees are notified: re-inviting someone already
    invited writes nothing and so publishes nothing."""
    put_user(aws, "host", first_name="Ada")
    put_user(aws, "u2")
    event_id = client("host").post(
        "/events/", json={"name": "Gala", "invitee_ids": ["u2"]}
    ).json()["id"]

    calls = _capture_publishes(monkeypatch)  # after u2 is already invited
    resp = client("host").post(
        f"/events/{event_id}/invitees", json={"invitee_ids": ["u2"]}
    )
    assert resp.status_code == 200
    assert _of_type(calls, "event_invitation") == []
