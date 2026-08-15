"""The notification settings route: GET defaults and PUT round-trips.

Step 12 adds `email_notifications` alongside the mute flags. These tests lock in
that both endpoints agree on it (the source app was asymmetric: its GET defaults
omitted the flag while its PUT accepted it) and that a partial PUT only touches
the fields it carried. Step 13 (phase C) adds the two event mutes and the
derivation property that keeps every type muteable.
"""

# Every notification type this app raises. The consumer mutes a type by reading
# f"mute_{type}", so each of these must have that exact field on the settings
# model and in the route's writable set: the invariant the whole pipeline leans
# on (a type whose flag the consumer can't read would be silently un-muteable).
NOTIFICATION_TYPES = (
    "follow",
    "wishlist_created",
    "wish_added",
    "wishlist_loved",
    "event_created",
    "event_invitation",
)


def test_get_defaults_for_user_with_no_row(client):
    """A user who never opened the screen has no settings row, so GET returns
    the model defaults: nothing muted (all six types) and email copies ON."""
    res = client("u1").get("/notifications/settings")
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == "u1"
    for notification_type in NOTIFICATION_TYPES:
        assert body[f"mute_{notification_type}"] is False
    assert body["email_notifications"] is True


def test_mute_field_derivation_holds_for_every_type():
    """f"mute_{type}" is a real settings field AND a writable mute for every
    type, with no orphans either way: a type whose flag the consumer can't read
    would be un-muteable, and a mute with no type would be dead config. Locks
    the model, the route's _MUTE_FIELDS, and the six types together."""
    from app.models.notifications import NotificationSettings, NotificationSettingsUpdate
    from app.routes.notifications import _MUTE_FIELDS

    derived = {f"mute_{t}" for t in NOTIFICATION_TYPES}
    assert derived <= set(NotificationSettings.model_fields)
    assert derived <= set(NotificationSettingsUpdate.model_fields)
    assert set(_MUTE_FIELDS) == derived


def test_put_event_mutes_roundtrip(client):
    """The two event mutes persist independently and don't disturb the others:
    a partial PUT of both sticks across a fresh GET, other mutes stay default."""
    put = client("u1").put(
        "/notifications/settings",
        json={"mute_event_created": True, "mute_event_invitation": True},
    )
    assert put.status_code == 200
    body = put.json()
    assert body["mute_event_created"] is True
    assert body["mute_event_invitation"] is True

    got = client("u1").get("/notifications/settings").json()
    assert got["mute_event_created"] is True
    assert got["mute_event_invitation"] is True
    # Untouched mutes remain false.
    assert got["mute_follow"] is False
    assert got["mute_wishlist_created"] is False


def test_put_email_notifications_roundtrips(client):
    """Turning email copies off persists: the PUT response and a fresh GET both
    report email_notifications False, and the mutes stay at their defaults."""
    put = client("u1").put(
        "/notifications/settings", json={"email_notifications": False}
    )
    assert put.status_code == 200
    assert put.json()["email_notifications"] is False

    got = client("u1").get("/notifications/settings").json()
    assert got["email_notifications"] is False
    assert got["mute_follow"] is False


def test_put_is_partial_and_leaves_other_fields(client):
    """Two independent PUTs (a mute, then the email flag) both stick: an omitted
    field is left as-is rather than reset to its default."""
    client("u1").put("/notifications/settings", json={"mute_follow": True})
    client("u1").put("/notifications/settings", json={"email_notifications": False})

    got = client("u1").get("/notifications/settings").json()
    assert got["mute_follow"] is True
    assert got["email_notifications"] is False
    # Untouched mutes remain false.
    assert got["mute_wishlist_created"] is False
