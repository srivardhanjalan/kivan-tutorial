"""Love/unlove: the wishlist love_count is the same conditional-edge cache the
follow graph uses, so it moves exactly once per state change and a repeat love
or unlove is a harmless no-op.
"""
from conftest import WISHLISTS_TABLE, put_user, put_wishlist


def _love_count(aws, wishlist_id):
    return aws.Table(WISHLISTS_TABLE).get_item(Key={"id": wishlist_id})["Item"][
        "love_count"
    ]


def test_love_increments_count_and_sets_status(client, aws):
    """(f) A first love bumps love_count to one and flips is_loved for the
    lover."""
    put_user(aws, "lover")
    put_wishlist(aws, "wl", created_by="owner")
    c = client("lover")

    resp = c.post("/wishlists/wl/love")

    assert resp.status_code == 204
    assert _love_count(aws, "wl") == 1
    assert c.get("/wishlists/wl/love/status").json() == {"is_loved": True}


def test_repeat_love_does_not_double_count(client, aws):
    """(f) Loving twice is idempotent: the second conditional put fails, so the
    count stays at one."""
    put_user(aws, "lover")
    put_wishlist(aws, "wl", created_by="owner")
    c = client("lover")

    c.post("/wishlists/wl/love")
    resp = c.post("/wishlists/wl/love")

    assert resp.status_code == 204
    assert _love_count(aws, "wl") == 1


def test_unlove_decrements_count_and_clears_status(client, aws):
    """(f) Unloving after a love returns the count to zero and clears is_loved."""
    put_user(aws, "lover")
    put_wishlist(aws, "wl", created_by="owner")
    c = client("lover")

    c.post("/wishlists/wl/love")
    resp = c.delete("/wishlists/wl/love")

    assert resp.status_code == 204
    assert _love_count(aws, "wl") == 0
    assert c.get("/wishlists/wl/love/status").json() == {"is_loved": False}


def test_repeat_unlove_floors_count_at_zero(client, aws):
    """(f) A second unlove is a no-op 204 and never drives love_count negative."""
    put_user(aws, "lover")
    put_wishlist(aws, "wl", created_by="owner")
    c = client("lover")

    c.post("/wishlists/wl/love")
    c.delete("/wishlists/wl/love")
    resp = c.delete("/wishlists/wl/love")

    assert resp.status_code == 204
    assert _love_count(aws, "wl") == 0


def test_love_missing_wishlist_is_404(client, aws):
    """(f) A love aimed at a wishlist that does not exist is a 404, not a
    phantom edge."""
    put_user(aws, "lover")

    resp = client("lover").post("/wishlists/nope/love")

    assert resp.status_code == 404
