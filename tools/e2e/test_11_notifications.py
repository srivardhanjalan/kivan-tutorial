"""
Step 11 — notifications pipeline (PR #92 proof list).

The pipeline is async (producer → SQS → Lambda consumer → notifications table),
so every arrival check polls the feed rather than sleeping a fixed time. Proofs
mirrored here: a follow lands in the feed and bumps the unread count; wish_added
carries its parent wishlist_id in the enriched resource; a mute suppresses the
next event and unmute restores it; the count keeps counting past 99 ("99+").
"""
import uuid

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step11]


def _feed(client):
    r = client.get("/notifications/me")
    r.raise_for_status()
    return r.json()


def _has(feed, ntype, actor_id):
    return any(
        n["notification_type"] == ntype and n["actor"]["id"] == actor_id
        for n in feed["notifications"]
    )


def test_follow_creates_feed_row_and_increments_unread(clerk_user, poll):
    actor = clerk_user("Alan", "Actor")
    recipient = clerk_user("Rita", "Recipient")

    before = recipient.client.get("/notifications/unread-count").json()["unread_count"]

    r = actor.client.post(f"/users/{recipient.user_id}/follow")
    assert r.status_code == 204

    feed = poll(lambda: _feed(recipient.client),
                until=lambda f: _has(f, "follow", actor.user_id))
    row = next(n for n in feed["notifications"]
               if n["notification_type"] == "follow" and n["actor"]["id"] == actor.user_id)
    assert "Alan Actor" in row["message"]
    assert row["read"] is False
    after = recipient.client.get("/notifications/unread-count").json()["unread_count"]
    assert after > before


def test_wish_added_enrichment_carries_wishlist_id(clerk_user, poll):
    actor = clerk_user("Wendy", "Wisher")
    recipient = clerk_user("Fred", "Follower")

    assert recipient.client.post(f"/users/{actor.user_id}/follow").status_code == 204

    wl = actor.client.post("/wishlists/", json={"name": f"Ideas {uuid.uuid4().hex[:6]}",
                                                "privacy_type": "public"})
    assert wl.status_code == 201
    wishlist_id = wl.json()["id"]
    wish_name = f"Espresso Machine {uuid.uuid4().hex[:6]}"
    w = actor.client.post("/wishes/", json={"wishlist_id": wishlist_id, "name": wish_name})
    assert w.status_code == 201

    feed = poll(lambda: _feed(recipient.client),
                until=lambda f: _has(f, "wish_added", actor.user_id))
    row = next(n for n in feed["notifications"]
               if n["notification_type"] == "wish_added" and n["actor"]["id"] == actor.user_id)
    assert wish_name in row["message"]
    assert row["resource"] is not None
    assert row["resource"]["type"] == "wish"
    # The ported dead-end fix: wish_added's resource carries the parent wishlist.
    assert row["resource"].get("wishlist_id") == wishlist_id

    actor.client.delete(f"/wishlists/{wishlist_id}")  # best-effort


def test_mute_follow_suppresses_then_unmute_restores(clerk_user, poll):
    recipient = clerk_user("Mona", "Muter")
    third = clerk_user("Tom", "Third")

    # Mute follows, then a fresh actor follows: no follow row should appear.
    assert recipient.client.put("/notifications/settings",
                                json={"mute_follow": True}).status_code == 200
    assert third.client.post(f"/users/{recipient.user_id}/follow").status_code == 204

    muted = poll(lambda: _feed(recipient.client),
                 until=lambda f: _has(f, "follow", third.user_id),
                 timeout=20)
    assert not _has(muted, "follow", third.user_id), "muted follow should not land"

    # Unmute; the same actor re-follows and now the row lands.
    assert recipient.client.put("/notifications/settings",
                                json={"mute_follow": False}).status_code == 200
    assert third.client.delete(f"/users/{recipient.user_id}/unfollow").status_code == 204
    assert third.client.post(f"/users/{recipient.user_id}/follow").status_code == 204

    restored = poll(lambda: _feed(recipient.client),
                    until=lambda f: _has(f, "follow", third.user_id))
    assert _has(restored, "follow", third.user_id), "unmuted follow should land"


def test_unread_count_passes_ninety_nine(clerk_user, table):
    """The "99+" render is a count over 99. The backend has no cap — it keeps
    counting. Seed 101 unread rows straight into the notifications table (the
    same shape the Lambda writes) so this is fast and deterministic, then read
    the count and pagination back through the real API."""
    recipient = clerk_user("Nadia", "Ninety")
    actor = clerk_user("Cara", "Counter")
    notifications = table("notifications")

    ids = []
    try:
        for i in range(101):
            nid = uuid.uuid4().hex
            ids.append(nid)
            notifications.put_item(Item={
                "id": nid,
                "user_id": recipient.user_id,
                "actor_id": actor.user_id,
                "notification_type": "follow",
                "message": "Cara Counter started following you",
                "read": False,
                "created_at": f"2026-08-26T00:{i // 60:02d}:{i % 60:02d}.{i:03d}Z",
                "ttl": 9999999999,
            })

        count = recipient.client.get("/notifications/unread-count").json()["unread_count"]
        assert count >= 100
        page = _feed(recipient.client)
        assert page["total"] >= 100
        assert page["unread_count"] >= 100
        assert page["has_more"] is True  # a >99 feed cannot fit one 20-row page
    finally:
        for nid in ids:
            try:
                notifications.delete_item(Key={"id": nid})
            except Exception:
                pass
