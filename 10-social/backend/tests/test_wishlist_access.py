"""Wishlist access split (step 10): reading is public, writing stays
single-owner. A non-owner can GET any wishlist (a friend's collection off their
profile, one they are about to love) but cannot PUT it; a missing wishlist is a
404 on both.
"""
from conftest import put_wishlist


def test_non_owner_can_read_wishlist(client, aws):
    """(g) GET by a non-owner returns 200: every wishlist is publicly viewable
    this step."""
    put_wishlist(aws, "wl", created_by="owner", name="Owner's list")

    resp = client("stranger").get("/wishlists/wl")

    assert resp.status_code == 200
    assert resp.json()["name"] == "Owner's list"


def test_non_owner_cannot_update_wishlist(client, aws):
    """(g) PUT by a non-owner is a 403, and the stored name is untouched."""
    put_wishlist(aws, "wl", created_by="owner", name="Owner's list")

    resp = client("stranger").put("/wishlists/wl", json={"name": "Hijacked"})

    assert resp.status_code == 403
    # The write never landed.
    assert client("owner").get("/wishlists/wl").json()["name"] == "Owner's list"


def test_missing_wishlist_is_404(client, aws):
    """(g) A GET for a wishlist that does not exist is a 404."""
    resp = client("stranger").get("/wishlists/nope")

    assert resp.status_code == 404


def test_owner_can_update_wishlist(client, aws):
    """(g) The other side of the split: the owner's PUT succeeds, proving the
    403 above is an ownership check, not a blanket block on the route."""
    put_wishlist(aws, "wl", created_by="owner", name="Owner's list")

    resp = client("owner").put("/wishlists/wl", json={"name": "Renamed"})

    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"
