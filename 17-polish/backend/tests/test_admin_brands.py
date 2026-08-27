"""Admin CRUD for the brands directory (step 15 phase B).

Brands are reference data with a client-supplied slug id, created without
clobbering a seeded row and edited field-scoped so a seeded logo survives. Runs
against the moto brands table the shared fixtures build, with require_admin
exercised end to end (conftest's `client` factory overrides the auth dependency).
"""
from conftest import (
    BRANDS_TABLE,
    bucket_url,
    head_exists,
    photos_bucket,
    put_brand,
    put_user,
)


def _set_logo(aws, brand_id, url):
    aws.Table(BRANDS_TABLE).update_item(
        Key={"id": brand_id},
        UpdateExpression="SET logo_url = :u",
        ExpressionAttributeValues={":u": url},
    )


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
    """An admin-created brand with no logo uploaded starts logoless (the write
    model's logo_url is optional and defaults to None)."""
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
    """A field-scoped edit that omits logo_url never touches it, so a seeded logo
    survives an edit to the text fields (only an uploaded logo_url swaps it)."""
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


# ── Logo upload: the pending-claim photo lifecycle (step 17) ──────────────────


def test_create_brand_claims_pending_logo(aws, client, monkeypatch):
    """A create carrying a pending logo key claims it into the permanent keyspace
    (pending gone, permanent present); the response logo is a signed read of the
    permanent object."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    pending_key = "pending/brand_logo/admin1/logo.jpg"
    permanent_key = "brand_logo/admin1/logo.jpg"
    s3.put_object(Bucket=bucket, Key=pending_key, Body=b"img")

    resp = client("admin1").post(
        "/admin/brands", json=_new_brand(id="acme", logo_url=bucket_url(bucket, pending_key))
    )
    assert resp.status_code == 201
    assert permanent_key in resp.json()["logo_url"]  # signed read of the permanent key
    assert not head_exists(s3, bucket, pending_key)  # claimed out of pending
    assert head_exists(s3, bucket, permanent_key)  # ...into permanent


def test_update_brand_replaces_logo(aws, client, monkeypatch):
    """Uploading a new logo on edit claims the new object and sweeps the old
    admin-uploaded one it replaces."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    old_key = "brand_logo/admin1/old.jpg"
    s3.put_object(Bucket=bucket, Key=old_key, Body=b"old")
    put_brand(aws, "acme")
    _set_logo(aws, "acme", bucket_url(bucket, old_key))

    new_pending = "pending/brand_logo/admin1/new.jpg"
    new_permanent = "brand_logo/admin1/new.jpg"
    s3.put_object(Bucket=bucket, Key=new_pending, Body=b"new")

    resp = client("admin1").put(
        "/admin/brands/acme", json={"logo_url": bucket_url(bucket, new_pending)}
    )
    assert resp.status_code == 200
    assert new_permanent in resp.json()["logo_url"]
    assert head_exists(s3, bucket, new_permanent)  # new claimed
    assert not head_exists(s3, bucket, new_pending)  # out of pending
    assert not head_exists(s3, bucket, old_key)  # old admin logo swept


def test_delete_brand_sweeps_uploaded_logo(aws, client, monkeypatch):
    """Deleting a brand sweeps its admin-uploaded logo object."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    logo_key = "brand_logo/admin1/logo.jpg"
    s3.put_object(Bucket=bucket, Key=logo_key, Body=b"img")
    put_brand(aws, "acme")
    _set_logo(aws, "acme", bucket_url(bucket, logo_key))

    assert client("admin1").delete("/admin/brands/acme").status_code == 204
    assert not head_exists(s3, bucket, logo_key)


def test_delete_brand_leaves_shared_catalog_logo(aws, client, monkeypatch):
    """A seed logo under catalog/ is shared reference data, so a brand delete
    never reaps it (delete_photo_by_url skips the catalog keyspace)."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    catalog_key = "catalog/brands/acme.png"
    s3.put_object(Bucket=bucket, Key=catalog_key, Body=b"seed")
    put_brand(aws, "acme")
    _set_logo(aws, "acme", bucket_url(bucket, catalog_key))

    assert client("admin1").delete("/admin/brands/acme").status_code == 204
    assert head_exists(s3, bucket, catalog_key)  # shared seed object untouched


def test_update_brand_keeps_shared_catalog_logo_on_replace(aws, client, monkeypatch):
    """Replacing a seeded catalog logo with an admin upload claims the new object
    but never deletes the shared seed one."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    catalog_key = "catalog/brands/acme.png"
    s3.put_object(Bucket=bucket, Key=catalog_key, Body=b"seed")
    put_brand(aws, "acme")
    _set_logo(aws, "acme", bucket_url(bucket, catalog_key))

    new_pending = "pending/brand_logo/admin1/new.jpg"
    new_permanent = "brand_logo/admin1/new.jpg"
    s3.put_object(Bucket=bucket, Key=new_pending, Body=b"new")

    resp = client("admin1").put(
        "/admin/brands/acme", json={"logo_url": bucket_url(bucket, new_pending)}
    )
    assert resp.status_code == 200
    assert new_permanent in resp.json()["logo_url"]
    assert head_exists(s3, bucket, new_permanent)  # new claimed
    assert head_exists(s3, bucket, catalog_key)  # shared seed logo left alone


def test_create_brand_rejects_another_users_upload(aws, client, monkeypatch):
    """A pending key stamped with someone else's id is rejected (400) — the same
    ownership guard every claim-on-save route enforces."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    foreign = "pending/brand_logo/someone_else/logo.jpg"
    s3.put_object(Bucket=bucket, Key=foreign, Body=b"img")

    resp = client("admin1").post(
        "/admin/brands", json=_new_brand(id="acme", logo_url=bucket_url(bucket, foreign))
    )
    assert resp.status_code == 400
