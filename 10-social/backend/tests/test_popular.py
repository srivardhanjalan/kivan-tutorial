"""The Discover rails read their index pre-sorted, most-popular first. Both
popular routes Query a GSI with ScanIndexForward=False, so the ranking is the
index's job, not a Scan-and-sort: these assert the descending order the
clients depend on.
"""
from conftest import put_user, put_wishlist


def test_popular_users_are_ranked_by_follower_count_desc(client, aws):
    """(h) GET /users/popular returns users most-followed first."""
    put_user(aws, "mid", first_name="Mid", last_name="User", follower_count=5)
    put_user(aws, "top", first_name="Top", last_name="User", follower_count=10)
    put_user(aws, "low", first_name="Low", last_name="User", follower_count=2)

    resp = client("viewer").get("/users/popular")

    assert resp.status_code == 200
    order = [u["id"] for u in resp.json()]
    assert order == ["top", "mid", "low"]


def test_popular_wishlists_are_ranked_by_love_count_desc(client, aws):
    """(h) GET /wishlists/popular returns wishlists most-loved first."""
    put_wishlist(aws, "wl_mid", created_by="owner", love_count=3)
    put_wishlist(aws, "wl_top", created_by="owner", love_count=9)
    put_wishlist(aws, "wl_low", created_by="owner", love_count=1)

    resp = client("viewer").get("/wishlists/popular")

    assert resp.status_code == 200
    order = [w["id"] for w in resp.json()]
    assert order == ["wl_top", "wl_mid", "wl_low"]
