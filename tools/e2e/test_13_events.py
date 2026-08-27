"""
Step 13 — events (PR #96 proof list).

Create with auto-host and a field round-trip; /events/me; a user invitee that
gets an event_invitation notification, RSVPs, and whose RSVP a non-invitee
cannot change; an email invitee row that a freshly-signed-up user with that
address claims and RSVPs by email; mute_event_invitation; and the cascade delete
that clears the host/invitee/wishlist-link rows and the event itself.
"""
import uuid

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step13]


def _make_event(host, **overrides):
    body = {"name": f"Party {uuid.uuid4().hex[:6]}", "is_public": False}
    body.update(overrides)
    r = host.client.post("/events/", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_create_auto_host_and_round_trip(clerk_user):
    host = clerk_user("Hera", "Host")
    name = f"Dinner {uuid.uuid4().hex[:6]}"
    ev = _make_event(host, name=name, description="bring wine", location="Rome",
                     event_date="2026-12-01T18:00:00Z", event_type="birthday")
    eid = ev["id"]
    try:
        assert ev["name"] == name
        assert ev["description"] == "bring wine"
        assert ev["location"] == "Rome"
        assert ev["created_by"] == host.user_id

        detail = host.client.get(f"/events/{eid}").json()
        assert detail["is_host"] is True
        assert host.user_id in [h["id"] for h in detail["hosts"]]

        mine = host.client.get("/events/me").json()
        assert eid in [e["id"] for e in mine["hosting"]]
    finally:
        host.client.delete(f"/events/{eid}")


def test_user_invitee_notification_rsvp_and_non_invitee_forbidden(clerk_user, poll, table):
    host = clerk_user("Ivan", "Inviter")
    guest = clerk_user("Gwen", "Guest")
    stranger = clerk_user("Stan", "Stranger")
    ev = _make_event(host)
    eid = ev["id"]
    try:
        r = host.client.post(f"/events/{eid}/invitees", json={"invitee_ids": [guest.user_id]})
        assert r.status_code == 200

        # event_invitation notification reaches the invited user
        feed = poll(lambda: guest.client.get("/notifications/me").json(),
                    until=lambda f: any(n["notification_type"] == "event_invitation"
                                        and n["actor"]["id"] == host.user_id
                                        for n in f["notifications"]))
        assert any(n["notification_type"] == "event_invitation"
                   and n["actor"]["id"] == host.user_id for n in feed["notifications"])

        # invited surfaces on /events/me
        invited = guest.client.get("/events/me").json()["invited"]
        assert eid in [e["id"] for e in invited]

        # RSVP going -> maybe, persisted on the raw row
        assert guest.client.patch(f"/events/{eid}/invitees/{guest.user_id}",
                                  json={"rsvp_status": "going"}).status_code == 200
        row = table("event-invitees").get_item(
            Key={"event_id": eid, "invitee_id": guest.user_id})["Item"]
        assert row["rsvp_status"] == "going"
        assert row["invitee_type"] == "user"
        assert guest.client.patch(f"/events/{eid}/invitees/{guest.user_id}",
                                  json={"rsvp_status": "maybe"}).status_code == 200
        row = table("event-invitees").get_item(
            Key={"event_id": eid, "invitee_id": guest.user_id})["Item"]
        assert row["rsvp_status"] == "maybe"

        # a bad RSVP value is 422
        assert guest.client.patch(f"/events/{eid}/invitees/{guest.user_id}",
                                  json={"rsvp_status": "pending"}).status_code == 422

        # a non-invitee cannot change someone else's RSVP
        assert stranger.client.patch(f"/events/{eid}/invitees/{guest.user_id}",
                                     json={"rsvp_status": "going"}).status_code == 403

        # remove exercises the delete path
        assert host.client.delete(f"/events/{eid}/invitees/{guest.user_id}").status_code == 200
    finally:
        host.client.delete(f"/events/{eid}")


def test_email_invitee_claim_and_rsvp(clerk_user, table):
    host = clerk_user("Ella", "EmailHost")
    # The claimer's +clerk_test email is what we invite by address; once they are
    # provisioned (a /users/me touch) the event shows up under their invited list.
    claimer = clerk_user("Cliff", "Claimer")
    assert claimer.client.get("/users/me").status_code == 200

    ev = _make_event(host)
    eid = ev["id"]
    try:
        r = host.client.post(f"/events/{eid}/invitees",
                             json={"invitee_emails": [claimer.email]})
        assert r.status_code == 200

        row = table("event-invitees").get_item(
            Key={"event_id": eid, "invitee_id": claimer.email})["Item"]
        assert row["invitee_type"] == "email"

        invited = claimer.client.get("/events/me").json()["invited"]
        assert eid in [e["id"] for e in invited], "email invite should be claimed on sign-in"

        # RSVP by the email identifier
        assert claimer.client.patch(f"/events/{eid}/invitees/{claimer.email}",
                                    json={"rsvp_status": "going"}).status_code == 200
        row = table("event-invitees").get_item(
            Key={"event_id": eid, "invitee_id": claimer.email})["Item"]
        assert row["rsvp_status"] == "going"
    finally:
        host.client.delete(f"/events/{eid}")


def test_mute_event_invitation_suppresses(clerk_user, poll):
    host = clerk_user("Mimi", "MuteHost")
    guest = clerk_user("Gus", "MutedGuest")
    assert guest.client.put("/notifications/settings",
                            json={"mute_event_invitation": True}).status_code == 200
    ev = _make_event(host)
    eid = ev["id"]
    try:
        assert host.client.post(f"/events/{eid}/invitees",
                               json={"invitee_ids": [guest.user_id]}).status_code == 200
        muted = poll(lambda: guest.client.get("/notifications/me").json(),
                     until=lambda f: any(n["notification_type"] == "event_invitation"
                                         for n in f["notifications"]),
                     timeout=20)
        assert not any(n["notification_type"] == "event_invitation"
                       for n in muted["notifications"]), "muted invite should not notify"
    finally:
        host.client.delete(f"/events/{eid}")


def test_delete_cascade_clears_all_join_rows(clerk_user, table):
    host = clerk_user("Cass", "Cascade")
    guest = clerk_user("Gina", "CascGuest")
    ev = _make_event(host)
    eid = ev["id"]

    # a co-host, an invitee, and a linked wishlist to cascade
    assert host.client.post(f"/events/{eid}/hosts",
                           json={"user_id": guest.user_id}).status_code == 200
    assert host.client.post(f"/events/{eid}/invitees",
                           json={"invitee_emails": ["ghost@example.com"]}).status_code == 200
    wl = host.client.post("/wishlists/", json={"name": f"Gifts {uuid.uuid4().hex[:6]}",
                                               "privacy_type": "public"})
    wid = wl.json()["id"]
    assert host.client.post(f"/events/{eid}/wishlists",
                           json={"wishlist_id": wid}).status_code == 200

    assert host.client.delete(f"/events/{eid}").status_code == 204

    assert host.client.get(f"/events/{eid}").status_code == 404
    assert "Item" not in table("events").get_item(Key={"id": eid})
    assert table("event-hosts").query(
        KeyConditionExpression="event_id = :e",
        ExpressionAttributeValues={":e": eid})["Count"] == 0
    assert table("event-invitees").query(
        KeyConditionExpression="event_id = :e",
        ExpressionAttributeValues={":e": eid})["Count"] == 0
    assert table("event-wishlists").query(
        KeyConditionExpression="event_id = :e",
        ExpressionAttributeValues={":e": eid})["Count"] == 0

    host.client.delete(f"/wishlists/{wid}")  # best-effort
