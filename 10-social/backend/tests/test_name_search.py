"""The name_lowercase search key across its lifecycle: cleared on a rename to
empty (REMOVE, never store ""), and read back through the typeahead search.

Same sparse-index constraint as provisioning, on the update side: PUT /users/me
that clears a name must REMOVE name_lowercase, not set it to "". A stored "" is
both an invalid GSI key (the write would 500) and, if it somehow landed, a row
that pollutes every prefix query.
"""
from conftest import USERS_TABLE, put_user


def test_put_name_to_empty_removes_name_lowercase(client, aws):
    """(c) Clearing both names via PUT /users/me REMOVEs name_lowercase, so the
    user drops out of name search rather than storing an empty key."""
    put_user(aws, "user_1", first_name="Grace", last_name="Hopper")
    # Precondition: the seeded user is findable and carries the key.
    assert "name_lowercase" in aws.Table(USERS_TABLE).get_item(
        Key={"id": "user_1"}
    )["Item"]

    resp = client("user_1").put(
        "/users/me", json={"first_name": "", "last_name": ""}
    )

    assert resp.status_code == 200
    item = aws.Table(USERS_TABLE).get_item(Key={"id": "user_1"})["Item"]
    assert "name_lowercase" not in item
    assert item["first_name"] == ""
    assert item["last_name"] == ""


def test_search_finds_named_users_by_prefix(client, aws):
    """(d) Search returns users whose name_lowercase begins with the query."""
    put_user(aws, "alan", first_name="Alan", last_name="Turing")
    put_user(aws, "alice", first_name="Alice", last_name="Wong")
    put_user(aws, "grace", first_name="Grace", last_name="Hopper")

    resp = client("viewer").get("/users/search", params={"q": "al"})

    assert resp.status_code == 200
    ids = {u["id"] for u in resp.json()}
    assert ids == {"alan", "alice"}  # both "al…"; "grace" excluded


def test_search_excludes_nameless_users(client, aws):
    """(d) A user provisioned without a name is absent from the sparse index,
    so no query surfaces them: not even a query matching their would-be name."""
    put_user(aws, "alan", first_name="Alan", last_name="Turing")
    put_user(aws, "ghost")  # no name → no name_lowercase → not in NameSearchIndex

    resp = client("viewer").get("/users/search", params={"q": "a"})

    assert resp.status_code == 200
    ids = {u["id"] for u in resp.json()}
    assert "ghost" not in ids
    assert ids == {"alan"}


def test_search_empty_query_returns_nothing(client, aws):
    """(d) An empty (or whitespace) query returns []: the client shows the
    popular rail instead, and an empty begins_with must never list everyone."""
    put_user(aws, "alan", first_name="Alan", last_name="Turing")

    resp = client("viewer").get("/users/search", params={"q": "   "})

    assert resp.status_code == 200
    assert resp.json() == []
