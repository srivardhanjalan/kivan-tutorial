"""Follow/unfollow: idempotent edges and denormalized counts that never drift.

follower_count/following_count are caches over the follow edges. The edge is a
conditional put/delete, so it exists exactly once; the counts move ONLY when
the edge actually changes state. A repeat follow must not double-count, and a
racing double-unfollow must not drive a count below zero.
"""
from conftest import USERS_TABLE, put_user


def _counts(aws, user_id):
    item = aws.Table(USERS_TABLE).get_item(Key={"id": user_id})["Item"]
    return item["follower_count"], item["following_count"]


def test_follow_increments_both_counts_once(client, aws):
    """(e) A first follow bumps the target's follower_count and the actor's
    following_count by exactly one."""
    put_user(aws, "actor")
    put_user(aws, "target")

    resp = client("actor").post("/users/target/follow")

    assert resp.status_code == 204
    assert _counts(aws, "target")[0] == 1  # target gained a follower
    assert _counts(aws, "actor")[1] == 1  # actor is now following one more


def test_repeat_follow_does_not_double_increment(client, aws):
    """(e) Following the same user twice is an idempotent 204; the second call
    fails the conditional put, so counts stay at one."""
    put_user(aws, "actor")
    put_user(aws, "target")
    c = client("actor")

    c.post("/users/target/follow")
    resp = c.post("/users/target/follow")

    assert resp.status_code == 204
    assert _counts(aws, "target")[0] == 1
    assert _counts(aws, "actor")[1] == 1


def test_unfollow_reverses_the_counts(client, aws):
    """(e) Unfollowing after a follow returns both counts to zero."""
    put_user(aws, "actor")
    put_user(aws, "target")
    c = client("actor")

    c.post("/users/target/follow")
    resp = c.delete("/users/target/unfollow")

    assert resp.status_code == 204
    assert _counts(aws, "target") == (0, 0)
    assert _counts(aws, "actor") == (0, 0)


def test_repeat_unfollow_floors_counts_at_zero(client, aws):
    """(e) A second unfollow is a no-op 204 and never drives a count negative
    (the conditional delete does not fire, so no decrement is attempted)."""
    put_user(aws, "actor")
    put_user(aws, "target")
    c = client("actor")

    c.post("/users/target/follow")
    c.delete("/users/target/unfollow")
    resp = c.delete("/users/target/unfollow")

    assert resp.status_code == 204
    assert _counts(aws, "target")[0] == 0
    assert _counts(aws, "actor")[1] == 0


def test_adjust_count_decrement_is_floored_at_zero(aws):
    """(e) The count guard itself: a decrement against a zero counter is
    refused by the ConditionExpression, so a lost race can't push it negative.
    Exercises adjust_count directly: the mechanism every unfollow relies on."""
    from app.database import users_table
    from app.utils.dynamo import adjust_count

    put_user(aws, "solo", follower_count=0)
    adjust_count(users_table, {"id": "solo"}, "follower_count", -1)

    assert _counts(aws, "solo")[0] == 0


def test_cannot_follow_yourself(client, aws):
    """(e) Self-follow is a 400 and writes no edge: the counts stay at zero."""
    put_user(aws, "actor")

    resp = client("actor").post("/users/actor/follow")

    assert resp.status_code == 400
    assert _counts(aws, "actor") == (0, 0)
