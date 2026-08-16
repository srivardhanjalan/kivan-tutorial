"""Co-ownership (step 14, phase A): the wishlist-owners join table and the one
generalized gate both wishlists and wishes funnel through. A wishlist has a flat
set of owners (creator + co-owners); any owner may edit the wishlist, add/edit/
delete its wishes, and add or remove owners, and a wishlist can never lose its
last owner. Reading stays open this step; the deliberate complete/uncomplete
asymmetry (any viewer may claim a gift, only owners may reverse a claim) is
exercised too. Everything runs against moto: no AWS account, no network.

The `client` fixture stands in for Clerk: `client("uid")` returns a TestClient
authenticated as that user id. Call it immediately before each request: the
override is replaced per call, so the last `client(...)` wins.
"""
from conftest import WISHLIST_OWNERS_TABLE, put_user, put_wishlist


def _create_wishlist(client, uid, **fields):
    """Create a wishlist as `uid`, returning the response (fields override the
    minimal {name})."""
    body = {"name": "My list", **fields}
    return client(uid).post("/wishlists/", json=body)


def _owner_ids(client, uid, wishlist_id):
    """The set of owner user ids GET /wishlists/{id}/owners reports."""
    resp = client(uid).get(f"/wishlists/{wishlist_id}/owners")
    assert resp.status_code == 200
    return {u["id"] for u in resp.json()}


# ── Create: auto-owner + owner_ids seeding ───────────────────────────────────


def test_create_auto_inserts_creator_as_owner(client, aws):
    """The creator is auto-inserted as the wishlist's first owner: an owner row
    keyed (wishlist_id, user_id), and the creator shows in the owners list."""
    put_user(aws, "owner")

    wishlist_id = _create_wishlist(client, "owner").json()["id"]

    row = aws.Table(WISHLIST_OWNERS_TABLE).get_item(
        Key={"wishlist_id": wishlist_id, "user_id": "owner"}
    )
    assert "Item" in row
    assert _owner_ids(client, "owner", wishlist_id) == {"owner"}


def test_create_with_owner_ids_seeds_co_owners(client, aws):
    """owner_ids at create seeds co-owners: each validated against the users
    table (an unknown id is skipped, not a 422), the creator deduped, and the
    result is the creator plus the existing named users."""
    put_user(aws, "owner")
    put_user(aws, "friend", first_name="Fri", last_name="End")

    wishlist_id = _create_wishlist(
        client, "owner", owner_ids=["friend", "ghost", "owner"]
    ).json()["id"]

    # ghost (no account) skipped; owner not duplicated.
    assert _owner_ids(client, "owner", wishlist_id) == {"owner", "friend"}


# ── Owner CRUD ───────────────────────────────────────────────────────────────


def test_add_owner(client, aws):
    """An owner promotes a real user to co-owner, who then appears in the owners
    list; a duplicate is 400 and an unknown user is 404."""
    put_user(aws, "owner")
    put_user(aws, "co", first_name="Co", last_name="Owner")
    wishlist_id = _create_wishlist(client, "owner").json()["id"]

    assert (
        client("owner")
        .post(f"/wishlists/{wishlist_id}/owners", json={"user_id": "co"})
        .status_code
        == 200
    )
    assert _owner_ids(client, "owner", wishlist_id) == {"owner", "co"}

    # Adding the same user again is a 400; an unknown user is a 404.
    assert (
        client("owner")
        .post(f"/wishlists/{wishlist_id}/owners", json={"user_id": "co"})
        .status_code
        == 400
    )
    assert (
        client("owner")
        .post(f"/wishlists/{wishlist_id}/owners", json={"user_id": "ghost"})
        .status_code
        == 404
    )


def test_add_owner_non_owner_forbidden(client, aws):
    """Only an owner can add owners: a stranger's POST is a 403 and no row is
    written."""
    put_user(aws, "owner")
    put_user(aws, "co")
    wishlist_id = _create_wishlist(client, "owner").json()["id"]

    assert (
        client("stranger")
        .post(f"/wishlists/{wishlist_id}/owners", json={"user_id": "co"})
        .status_code
        == 403
    )
    assert _owner_ids(client, "owner", wishlist_id) == {"owner"}


def test_remove_owner_and_last_owner_guard(client, aws):
    """A co-owner can be removed, but a wishlist can never lose its last owner."""
    put_user(aws, "owner")
    put_user(aws, "co")
    wishlist_id = _create_wishlist(client, "owner").json()["id"]
    client("owner").post(f"/wishlists/{wishlist_id}/owners", json={"user_id": "co"})

    assert (
        client("owner").delete(f"/wishlists/{wishlist_id}/owners/co").status_code == 200
    )
    assert _owner_ids(client, "owner", wishlist_id) == {"owner"}
    # Only the creator remains, so removing them is refused.
    assert (
        client("owner").delete(f"/wishlists/{wishlist_id}/owners/owner").status_code
        == 400
    )


def test_remove_owner_non_owner_forbidden(client, aws):
    """Only an owner can remove owners."""
    put_user(aws, "owner")
    wishlist_id = _create_wishlist(client, "owner", owner_ids=[]).json()["id"]
    put_user(aws, "co")
    client("owner").post(f"/wishlists/{wishlist_id}/owners", json={"user_id": "co"})

    assert (
        client("stranger").delete(f"/wishlists/{wishlist_id}/owners/co").status_code
        == 403
    )


def test_owners_list_is_a_view_read(client, aws):
    """The owners list is the view branch of the gate: any signed-in user can
    see who owns a wishlist (a non-owner reads it fine)."""
    put_user(aws, "owner")
    wishlist_id = _create_wishlist(client, "owner").json()["id"]

    assert client("stranger").get(f"/wishlists/{wishlist_id}/owners").status_code == 200


# ── What a co-owner can do ───────────────────────────────────────────────────


def test_co_owner_can_edit_wishlist(client, aws):
    """A co-owner passes the edit gate on the wishlist itself: their PUT lands,
    proving the gate reads the owners table, not created_by."""
    put_wishlist(aws, "wl", created_by="owner", name="Original", co_owners=["co"])

    resp = client("co").put("/wishlists/wl", json={"name": "Renamed by co"})

    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed by co"


def test_co_owner_can_crud_wishes(client, aws):
    """A co-owner can add, edit, and delete wishes on a wishlist they co-own:
    a wish's write access is just its wishlist's ownership."""
    put_wishlist(aws, "wl", created_by="owner", co_owners=["co"])

    created = client("co").post("/wishes/", json={"wishlist_id": "wl", "name": "Ball"})
    assert created.status_code == 201
    wish_id = created.json()["id"]

    edited = client("co").put(f"/wishes/{wish_id}", json={"name": "Beach ball"})
    assert edited.status_code == 200
    assert edited.json()["name"] == "Beach ball"

    assert client("co").delete(f"/wishes/{wish_id}").status_code == 204


def test_co_owner_visible_in_wishes_and_owners_reads(client, aws):
    """A co-owner shows up in the ownership-dependent reads: they appear in the
    owners list, and the wishes they added list back to any viewer."""
    put_user(aws, "owner")
    put_user(aws, "co", first_name="Co", last_name="Owner")
    put_wishlist(aws, "wl", created_by="owner", co_owners=["co"])
    client("co").post("/wishes/", json={"wishlist_id": "wl", "name": "Kite"})

    assert _owner_ids(client, "owner", "wl") == {"owner", "co"}
    names = [w["name"] for w in client("stranger").get("/wishlists/wl/wishes").json()]
    assert names == ["Kite"]


# ── Removal revokes access; single-owner unchanged ───────────────────────────


def test_removed_co_owner_loses_edit(client, aws):
    """Once removed, a former co-owner is a stranger again: their wishlist edit
    and their wish-add both 403, and the stored name is untouched."""
    put_wishlist(aws, "wl", created_by="owner", name="Original", co_owners=["co"])
    assert client("owner").delete("/wishlists/wl/owners/co").status_code == 200

    assert client("co").put("/wishlists/wl", json={"name": "Hijacked"}).status_code == 403
    assert (
        client("co").post("/wishes/", json={"wishlist_id": "wl", "name": "X"}).status_code
        == 403
    )
    assert client("owner").get("/wishlists/wl").json()["name"] == "Original"


def test_single_owner_unchanged_without_co_owners(client, aws):
    """With no co-owners, behavior is the old single-owner split: the owner edits
    (200), a stranger cannot (403), and the owners list is just the creator."""
    put_user(aws, "owner")
    put_wishlist(aws, "wl", created_by="owner", name="Original")

    assert client("owner").put("/wishlists/wl", json={"name": "New"}).status_code == 200
    assert client("stranger").put("/wishlists/wl", json={"name": "Nope"}).status_code == 403
    assert _owner_ids(client, "owner", "wl") == {"owner"}


# ── complete / uncomplete asymmetry ──────────────────────────────────────────


def test_any_viewer_can_complete_but_only_owner_uncompletes(client, aws):
    """Completing a wish is gift-claiming, so any signed-in viewer may do it;
    uncompleting is owner-or-co-owner only. A stranger completes (200) but
    cannot uncomplete (403); a co-owner can uncomplete (200)."""
    put_wishlist(aws, "wl", created_by="owner", co_owners=["co"])
    wish_id = client("owner").post(
        "/wishes/", json={"wishlist_id": "wl", "name": "Book"}
    ).json()["id"]

    assert client("stranger").post(f"/wishes/{wish_id}/complete").status_code == 200
    assert client("owner").get(f"/wishes/{wish_id}").json()["completed"] is True

    # A stranger cannot reverse the claim; a co-owner can.
    assert client("stranger").post(f"/wishes/{wish_id}/uncomplete").status_code == 403
    assert client("co").post(f"/wishes/{wish_id}/uncomplete").status_code == 200
    assert client("owner").get(f"/wishes/{wish_id}").json()["completed"] is False
