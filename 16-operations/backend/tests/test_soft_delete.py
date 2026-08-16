"""A soft-deleted account stays in the table for referential integrity but must
never surface to other users. Two routes drop it from index reads via
users.py's `_active()` helper (search and the Discover popular rail), and the
public profile funnels through `get_public_user`, which 404s a deleted account
rather than revealing it. These pin that each seeded `is_deleted=True` user is
absent from exactly those reads.

Each deleted user here is seeded so it WOULD otherwise appear: it carries a
name_lowercase that matches the search prefix, and a follower_count high enough
to top the popular ranking, so a passing test proves the exclusion is active
filtering, not an accident of the index.
"""
from conftest import put_user


def test_search_excludes_soft_deleted_users(client, aws):
    """(i) A soft-deleted user with a matching name is dropped from
    GET /users/search by `_active()`, even though the sparse index still holds
    their name_lowercase row."""
    put_user(aws, "alan", first_name="Alan", last_name="Turing")
    put_user(aws, "alba", first_name="Alba", last_name="Vidal", is_deleted=True)

    resp = client("viewer").get("/users/search", params={"q": "al"})

    assert resp.status_code == 200
    ids = {u["id"] for u in resp.json()}
    assert ids == {"alan"}  # both begin with "al"; the deleted "alba" is filtered


def test_popular_excludes_soft_deleted_users(client, aws):
    """(i) A soft-deleted user is dropped from GET /users/popular by `_active()`,
    even when their follower_count would otherwise rank them first."""
    put_user(aws, "top", first_name="Top", last_name="User", follower_count=10)
    put_user(
        aws, "gone", first_name="Gone", last_name="User",
        follower_count=99, is_deleted=True,
    )

    resp = client("viewer").get("/users/popular")

    assert resp.status_code == 200
    ids = [u["id"] for u in resp.json()]
    assert ids == ["top"]  # "gone" ranks highest by count but is filtered out


def test_public_profile_of_soft_deleted_user_is_404(client, aws):
    """(i) GET /users/{id} for a soft-deleted account is a 404, not a 403:
    get_public_user reports a deleted user as simply not there, so a deletion
    cannot be probed by the status code the profile route returns."""
    put_user(aws, "gone", first_name="Gone", last_name="User", is_deleted=True)

    resp = client("viewer").get("/users/gone")

    assert resp.status_code == 404
