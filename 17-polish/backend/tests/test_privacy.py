"""Privacy enforcement (step 14, phase B): privacy_type gates every wishlist
read surface. A public wishlist behaves exactly as it did before this step; a
private one is visible only to its owners and co-owners, and is withheld from
the popular feed, a stranger's profile view, a stranger's direct GET, the loved
shelf, an event's linked-wishlist list (the source's leak, fixed here), the
follower fan-out, and gift-claiming. Everything runs against moto: no AWS
account, no network.

The `client` fixture stands in for Clerk: `client("uid")` returns a TestClient
authenticated as that user id (the last `client(...)` before a request wins).
"""
import app.utils.notifications as notifications
from conftest import (
    FOLLOWERS_TABLE,
    WISHLIST_LOVES_TABLE,
    put_user,
    put_wishlist,
)


def _create_wishlist(client, uid, **fields):
    """Create a wishlist as `uid` (fields override the minimal {name})."""
    return client(uid).post("/wishlists/", json={"name": "My list", **fields})


def _create_event(client, uid, **fields):
    """Create an event as `uid`, public by default so any viewer can open it."""
    body = {"name": "Party", "is_public": True, **fields}
    return client(uid).post("/events/", json=body)


def _follow(aws, follower_id: str, following_id: str) -> None:
    """Seed a follow edge (follower_id follows following_id); FollowingIndex, the
    fan-out's read, projects the keys, so the bare edge is enough."""
    aws.Table(FOLLOWERS_TABLE).put_item(
        Item={"follower_id": follower_id, "following_id": following_id}
    )


def _love(aws, user_id: str, wishlist_id: str) -> None:
    """Seed a love edge directly: love carries no view gate (you can love any
    wishlist by id), so a private one can sit on a user's loved shelf."""
    aws.Table(WISHLIST_LOVES_TABLE).put_item(
        Item={"user_id": user_id, "wishlist_id": wishlist_id}
    )


def _capture_publishes(monkeypatch) -> list[dict]:
    """Replace the SQS fan-out publisher with a capture, returning the list its
    calls land in (patched on the notifications module, where the producers
    reference it as a module global)."""
    calls: list[dict] = []
    monkeypatch.setattr(
        notifications,
        "publish_notification_event",
        lambda **kwargs: calls.append(kwargs) or True,
    )
    return calls


# ── Direct GET: owner/co-owner see a private wishlist, a stranger 403s ────────


def test_private_wishlist_direct_get(client, aws):
    """A private wishlist's direct GET is owner-and-co-owner only: the creator
    and a co-owner read it (200), a stranger is a 403 (the source's choice, not
    a 404). A public wishlist stays readable by anyone."""
    put_user(aws, "owner")
    put_user(aws, "co")
    put_user(aws, "stranger")
    put_wishlist(aws, "priv", created_by="owner", co_owners=["co"], privacy_type="private")
    put_wishlist(aws, "pub", created_by="owner", privacy_type="public")

    assert client("owner").get("/wishlists/priv").status_code == 200
    assert client("co").get("/wishlists/priv").status_code == 200
    assert client("stranger").get("/wishlists/priv").status_code == 403
    # The public control is visible to the same stranger.
    assert client("stranger").get("/wishlists/pub").status_code == 200


def test_private_wishlist_wishes_hidden_from_stranger(client, aws):
    """The wishlist-scoped wishes listing rides the same view gate: a stranger
    cannot read a private wishlist's wishes (403), its owner can (200)."""
    put_user(aws, "owner")
    put_wishlist(aws, "priv", created_by="owner", privacy_type="private")
    client("owner").post("/wishes/", json={"wishlist_id": "priv", "name": "Kite"})

    assert client("stranger").get("/wishlists/priv/wishes").status_code == 403
    assert client("owner").get("/wishlists/priv/wishes").status_code == 200


# ── Discovery and profile surfaces filter private ────────────────────────────


def test_popular_feed_excludes_private(client, aws):
    """The most-loved rail shows only public wishlists: a private list, however
    loved, never surfaces on a discovery feed."""
    put_user(aws, "owner")
    put_wishlist(aws, "pub", created_by="owner", love_count=1, privacy_type="public")
    put_wishlist(aws, "priv", created_by="owner", love_count=9, privacy_type="private")

    ids = [w["id"] for w in client("viewer").get("/wishlists/popular").json()]

    assert ids == ["pub"]  # the higher-loved private list is filtered out


def test_profile_grid_filters_private_per_viewer(client, aws):
    """A user's profile grid shows public-or-own-or-co-owner: a stranger sees
    only the public list, the owner sees both, and a co-owner of the private one
    sees both too."""
    put_user(aws, "owner")
    put_user(aws, "co")
    put_user(aws, "stranger")
    put_wishlist(aws, "pub", created_by="owner", privacy_type="public")
    put_wishlist(aws, "priv", created_by="owner", co_owners=["co"], privacy_type="private")

    def ids(viewer):
        return {w["id"] for w in client(viewer).get("/users/owner/wishlists").json()}

    assert ids("stranger") == {"pub"}
    assert ids("owner") == {"pub", "priv"}
    assert ids("co") == {"pub", "priv"}


def test_loved_list_filters_private_per_viewer(client, aws):
    """The loved shelf filters the same way: a stranger sees only the public
    loved wishlist, a co-owner of the private one sees both."""
    put_user(aws, "owner")
    put_user(aws, "co")
    put_user(aws, "fan")
    put_user(aws, "stranger")
    put_wishlist(aws, "pub", created_by="owner", privacy_type="public")
    put_wishlist(aws, "priv", created_by="owner", co_owners=["co"], privacy_type="private")
    _love(aws, "fan", "pub")
    _love(aws, "fan", "priv")

    def ids(viewer):
        return {w["id"] for w in client(viewer).get("/users/fan/loved-wishlists").json()}

    assert ids("stranger") == {"pub"}
    assert ids("co") == {"pub", "priv"}


# ── Event-linked private wishlist: the source's leak, fixed per viewer ────────


def test_event_hides_linked_private_wishlist_from_non_owner(client, aws):
    """A private wishlist linked to a public event is re-checked per VIEWER on
    the event-detail read (the source returns it to everyone). A stranger and a
    non-owner event viewer see no linked wishlists; the wishlist's owner and
    co-owner, opening the same event, see it."""
    put_user(aws, "host")
    put_user(aws, "co")
    put_user(aws, "stranger")
    put_wishlist(aws, "priv", created_by="host", co_owners=["co"], privacy_type="private")
    event_id = _create_event(client, "host").json()["id"]
    assert client("host").post(
        f"/events/{event_id}/wishlists", json={"wishlist_id": "priv"}
    ).status_code == 200

    def linked(viewer):
        return [w["id"] for w in client(viewer).get(f"/events/{event_id}").json()["wishlists"]]

    # Hidden from a viewer who neither owns nor co-owns the private wishlist.
    assert linked("stranger") == []
    # Shown to the wishlist's owner and co-owner (both sides of the fix).
    assert linked("host") == ["priv"]
    assert linked("co") == ["priv"]


def test_event_shows_linked_public_wishlist_to_everyone(client, aws):
    """The control: a PUBLIC linked wishlist still shows to any event viewer, so
    the filter withholds only private lists, never all of them."""
    put_user(aws, "host")
    put_user(aws, "stranger")
    put_wishlist(aws, "pub", created_by="host", privacy_type="public")
    event_id = _create_event(client, "host").json()["id"]
    client("host").post(f"/events/{event_id}/wishlists", json={"wishlist_id": "pub"})

    linked = client("stranger").get(f"/events/{event_id}").json()["wishlists"]
    assert [w["id"] for w in linked] == ["pub"]


# ── Fan-out: a private wishlist notifies no follower ─────────────────────────


def test_wish_added_to_private_wishlist_fans_out_to_nobody(client, aws, monkeypatch):
    """A wish added to a private wishlist notifies no follower; the guard lives
    inside the producer, so the private list is silent while a public one still
    fans out."""
    put_user(aws, "owner", first_name="Ada")
    put_user(aws, "follower")
    _follow(aws, "follower", "owner")
    put_wishlist(aws, "priv", created_by="owner", privacy_type="private")
    put_wishlist(aws, "pub", created_by="owner", privacy_type="public")
    calls = _capture_publishes(monkeypatch)

    client("owner").post("/wishes/", json={"wishlist_id": "priv", "name": "Secret"})
    assert [c for c in calls if c["notification_type"] == "wish_added"] == []

    client("owner").post("/wishes/", json={"wishlist_id": "pub", "name": "Kite"})
    public = [c for c in calls if c["notification_type"] == "wish_added"]
    assert len(public) == 1
    assert set(public[0]["user_ids"]) == {"follower"}


def test_wishlist_created_private_fans_out_to_nobody(client, aws, monkeypatch):
    """Creating a private wishlist fans out to no follower; creating a public one
    does — the same producer-side gate as wish_added."""
    put_user(aws, "owner", first_name="Ada")
    put_user(aws, "follower")
    _follow(aws, "follower", "owner")
    calls = _capture_publishes(monkeypatch)

    _create_wishlist(client, "owner", privacy_type="private")
    assert [c for c in calls if c["notification_type"] == "wishlist_created"] == []

    _create_wishlist(client, "owner", privacy_type="public")
    public = [c for c in calls if c["notification_type"] == "wishlist_created"]
    assert len(public) == 1
    assert set(public[0]["user_ids"]) == {"follower"}


# ── Gift-claiming inherits the privacy-filtered view gate ─────────────────────


def test_stranger_cannot_complete_a_private_wish(client, aws):
    """Completing a wish uses the VIEW gate, now privacy-filtered: a stranger who
    cannot see a private wishlist cannot complete its wishes (403), while its
    owner and co-owner still can (200)."""
    put_user(aws, "owner")
    put_user(aws, "co")
    put_user(aws, "stranger")
    put_wishlist(aws, "priv", created_by="owner", co_owners=["co"], privacy_type="private")
    wish_id = client("owner").post(
        "/wishes/", json={"wishlist_id": "priv", "name": "Book"}
    ).json()["id"]

    assert client("stranger").post(f"/wishes/{wish_id}/complete").status_code == 403
    assert client("owner").post(f"/wishes/{wish_id}/complete").status_code == 200
    assert client("co").post(f"/wishes/{wish_id}/uncomplete").status_code == 200
