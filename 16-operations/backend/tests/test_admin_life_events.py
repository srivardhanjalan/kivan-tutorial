"""Admin CRUD for the life-events taxonomy (step 15 phase B).

The interesting contract is delete: a life-event id is a soft, unvalidated
lookup a wishlist or event stores by value, so deleting a referenced occasion is
a 409, never silent breakage. Runs against the moto tables the shared fixtures
build, with require_admin exercised end to end.
"""
from conftest import EVENTS_TABLE, put_life_event, put_user, put_wishlist


def _new_event(**overrides):
    body = {"id": "birthday", "name": "Birthday", "icon": "🎂"}
    body.update(overrides)
    return body


# ── require_admin: non-admins are forbidden across the write surface ──────────


def test_non_admin_forbidden_on_create(aws, client):
    put_user(aws, "plain", role="user")
    assert client("plain").post("/admin/life-events", json=_new_event()).status_code == 403


def test_non_admin_forbidden_on_update(aws, client):
    put_user(aws, "plain", role="user")
    put_life_event(aws, "birthday")
    resp = client("plain").put("/admin/life-events/birthday", json={"name": "B"})
    assert resp.status_code == 403


def test_non_admin_forbidden_on_delete(aws, client):
    put_user(aws, "plain", role="user")
    put_life_event(aws, "birthday")
    assert client("plain").delete("/admin/life-events/birthday").status_code == 403


# ── Create ───────────────────────────────────────────────────────────────────


def test_create_life_event_roundtrips(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post("/admin/life-events", json=_new_event(id="wedding", name="Wedding"))
    assert resp.status_code == 201
    assert resp.json()["id"] == "wedding"
    listed = client("admin1").get("/life-events").json()
    assert {e["id"] for e in listed} == {"wedding"}


def test_create_life_event_collision_is_409(aws, client):
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday", name="Seeded Birthday")
    resp = client("admin1").post("/admin/life-events", json=_new_event(id="birthday"))
    assert resp.status_code == 409


def test_create_life_event_missing_name_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").post("/admin/life-events", json={"id": "x"}).status_code == 422


# ── Update ───────────────────────────────────────────────────────────────────


def test_update_life_event_edits_only_sent_fields(aws, client):
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday", name="Birthday", display_order=1)
    resp = client("admin1").put("/admin/life-events/birthday", json={"name": "Bday"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Bday"
    assert resp.json()["display_order"] == 1  # untouched


def test_update_life_event_empty_body_is_noop(aws, client):
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday", name="Birthday")
    resp = client("admin1").put("/admin/life-events/birthday", json={})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Birthday"


def test_update_missing_life_event_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").put("/admin/life-events/ghost", json={"name": "x"}).status_code == 404


# ── Delete: the referenced-in-use 409 contract ───────────────────────────────


def test_delete_unreferenced_life_event_roundtrips(aws, client):
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday")
    assert client("admin1").delete("/admin/life-events/birthday").status_code == 204
    assert client("admin1").get("/life-events").json() == []


def test_delete_life_event_referenced_by_wishlist_is_409(aws, client):
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday")
    put_wishlist(aws, "wl1", created_by="admin1", life_event_id="birthday")
    resp = client("admin1").delete("/admin/life-events/birthday")
    assert resp.status_code == 409
    # Still there — the delete refused, it did not half-happen.
    assert {e["id"] for e in client("admin1").get("/life-events").json()} == {"birthday"}


def test_delete_life_event_referenced_by_event_is_409(aws, client):
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday")
    aws.Table(EVENTS_TABLE).put_item(Item={"id": "e1", "event_type": "birthday"})
    assert client("admin1").delete("/admin/life-events/birthday").status_code == 409


def test_delete_life_event_ignores_unrelated_references(aws, client):
    """A wishlist on a DIFFERENT occasion does not block this delete."""
    put_user(aws, "admin1", role="admin")
    put_life_event(aws, "birthday")
    put_wishlist(aws, "wl1", created_by="admin1", life_event_id="wedding")
    assert client("admin1").delete("/admin/life-events/birthday").status_code == 204


def test_delete_missing_life_event_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").delete("/admin/life-events/ghost").status_code == 404
