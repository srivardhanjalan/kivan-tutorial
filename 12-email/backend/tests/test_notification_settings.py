"""The notification settings route: GET defaults and PUT round-trips.

Step 12 adds `email_notifications` alongside the four mute flags. These tests
lock in that both endpoints agree on it (the source app was asymmetric: its GET
defaults omitted the flag while its PUT accepted it) and that a partial PUT only
touches the fields it carried.
"""


def test_get_defaults_for_user_with_no_row(client):
    """A user who never opened the screen has no settings row, so GET returns
    the model defaults: nothing muted and email copies ON."""
    res = client("u1").get("/notifications/settings")
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == "u1"
    assert body["mute_follow"] is False
    assert body["mute_wishlist_created"] is False
    assert body["mute_wish_added"] is False
    assert body["mute_wishlist_loved"] is False
    assert body["email_notifications"] is True


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
