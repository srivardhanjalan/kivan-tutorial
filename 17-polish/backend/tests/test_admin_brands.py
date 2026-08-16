"""Admin CRUD for the brands directory (step 15 phase B).

Brands are reference data with a client-supplied slug id, created without
clobbering a seeded row and edited field-scoped so a seeded logo survives. Runs
against the moto brands table the shared fixtures build, with require_admin
exercised end to end (conftest's `client` factory overrides the auth dependency).
"""
from conftest import BRANDS_TABLE, put_brand, put_user


def _new_brand(**overrides):
    body = {
        "id": "acme",
        "name": "Acme",
        "website_url": "https://acme.example.com",
        "category": "Home",
        "country": "US",
    }
    body.update(overrides)
    return body


# ── require_admin: non-admins are forbidden across the whole write surface ────


def test_non_admin_forbidden_on_create(aws, client):
    put_user(aws, "plain", role="user")
    assert client("plain").post("/admin/brands", json=_new_brand()).status_code == 403


def test_non_admin_forbidden_on_update(aws, client):
    put_user(aws, "plain", role="user")
    put_brand(aws, "acme")
    resp = client("plain").put("/admin/brands/acme", json={"name": "New"})
    assert resp.status_code == 403


def test_non_admin_forbidden_on_delete(aws, client):
    put_user(aws, "plain", role="user")
    put_brand(aws, "acme")
    assert client("plain").delete("/admin/brands/acme").status_code == 403


# ── Create ───────────────────────────────────────────────────────────────────


def test_create_brand_roundtrips(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post("/admin/brands", json=_new_brand(id="acme"))
    assert resp.status_code == 201
    assert resp.json()["id"] == "acme"
    # It now shows up in the public directory the read route serves.
    listed = client("admin1").get("/brands").json()
    assert {b["id"] for b in listed} == {"acme"}


def test_create_brand_has_no_logo_url(aws, client):
    """An admin-created brand starts logoless: the write model omits logo_url."""
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post("/admin/brands", json=_new_brand())
    assert resp.status_code == 201
    assert resp.json()["logo_url"] is None


def test_create_brand_collision_is_409(aws, client):
    """Re-using a seeded id is a conflict, never a silent overwrite of the row."""
    put_user(aws, "admin1", role="admin")
    put_brand(aws, "acme", name="Seeded Acme")
    resp = client("admin1").post("/admin/brands", json=_new_brand(id="acme"))
    assert resp.status_code == 409
    # The seeded row is untouched.
    assert (
        aws.Table(BRANDS_TABLE).get_item(Key={"id": "acme"})["Item"]["name"]
        == "Seeded Acme"
    )


def test_create_brand_missing_required_field_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    body = _new_brand()
    del body["website_url"]
    assert client("admin1").post("/admin/brands", json=body).status_code == 422


def test_create_brand_overlong_name_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post("/admin/brands", json=_new_brand(name="x" * 201))
    assert resp.status_code == 422


# ── Update ───────────────────────────────────────────────────────────────────


def test_update_brand_edits_only_sent_fields(aws, client):
    put_user(aws, "admin1", role="admin")
    put_brand(aws, "acme", name="Acme", category="Home")
    resp = client("admin1").put("/admin/brands/acme", json={"category": "Tech"})
    assert resp.status_code == 200
    assert resp.json()["category"] == "Tech"
    assert resp.json()["name"] == "Acme"  # untouched


def test_update_brand_preserves_seeded_logo(aws, client):
    """A field-scoped edit never touches logo_url, so a seeded logo survives an
    edit to the text fields — the whole reason the write model omits it."""
    put_user(aws, "admin1", role="admin")
    put_brand(aws, "acme")
    # Seed a logo directly (an external URL passes the signer through unchanged).
    aws.Table(BRANDS_TABLE).update_item(
        Key={"id": "acme"},
        UpdateExpression="SET logo_url = :u",
        ExpressionAttributeValues={":u": "https://cdn.example.com/acme.png"},
    )
    client("admin1").put("/admin/brands/acme", json={"name": "Acme Renamed"})
    stored = aws.Table(BRANDS_TABLE).get_item(Key={"id": "acme"})["Item"]
    assert stored["name"] == "Acme Renamed"
    assert stored["logo_url"] == "https://cdn.example.com/acme.png"


def test_update_brand_empty_body_is_noop(aws, client):
    put_user(aws, "admin1", role="admin")
    put_brand(aws, "acme", name="Acme")
    resp = client("admin1").put("/admin/brands/acme", json={})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Acme"


def test_update_missing_brand_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").put("/admin/brands/ghost", json={"name": "x"}).status_code == 404


def test_update_missing_brand_empty_body_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").put("/admin/brands/ghost", json={}).status_code == 404


# ── Delete ───────────────────────────────────────────────────────────────────


def test_delete_brand_roundtrips(aws, client):
    put_user(aws, "admin1", role="admin")
    put_brand(aws, "acme")
    assert client("admin1").delete("/admin/brands/acme").status_code == 204
    assert client("admin1").get("/brands").json() == []


def test_delete_missing_brand_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").delete("/admin/brands/ghost").status_code == 404
