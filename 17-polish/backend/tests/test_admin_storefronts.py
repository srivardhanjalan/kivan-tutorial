"""Admin CRUD for the storefronts catalog (step 15 phase B).

Delete is guarded: a store with products cannot be deleted (a 409), because a
product belongs to exactly one store and would be orphaned. Runs against the
moto tables the shared fixtures build, with require_admin exercised end to end.
"""
from conftest import (
    PRODUCTS_TABLE,
    STOREFRONTS_TABLE,
    bucket_url,
    head_exists,
    photos_bucket,
    put_storefront,
    put_user,
)


def _set_logo(aws, storefront_id, url):
    aws.Table(STOREFRONTS_TABLE).update_item(
        Key={"id": storefront_id},
        UpdateExpression="SET logo_url = :u",
        ExpressionAttributeValues={":u": url},
    )


def _new_store(**overrides):
    body = {"id": "acme", "name": "Acme Store"}
    body.update(overrides)
    return body


# ── require_admin: non-admins are forbidden across the write surface ──────────


def test_non_admin_forbidden_on_create(aws, client):
    put_user(aws, "plain", role="user")
    assert client("plain").post("/admin/storefronts", json=_new_store()).status_code == 403


def test_non_admin_forbidden_on_update(aws, client):
    put_user(aws, "plain", role="user")
    put_storefront(aws, "acme")
    assert client("plain").put("/admin/storefronts/acme", json={"name": "N"}).status_code == 403


def test_non_admin_forbidden_on_delete(aws, client):
    put_user(aws, "plain", role="user")
    put_storefront(aws, "acme")
    assert client("plain").delete("/admin/storefronts/acme").status_code == 403


# ── Create ───────────────────────────────────────────────────────────────────


def test_create_storefront_starts_with_zero_products(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post("/admin/storefronts", json=_new_store())
    assert resp.status_code == 201
    assert resp.json()["product_count"] == 0
    listed = client("admin1").get("/storefronts").json()
    assert {s["id"] for s in listed} == {"acme"}


def test_create_storefront_collision_is_409(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", name="Seeded")
    assert client("admin1").post("/admin/storefronts", json=_new_store()).status_code == 409


def test_create_storefront_missing_name_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").post("/admin/storefronts", json={"id": "x"}).status_code == 422


# ── Update ───────────────────────────────────────────────────────────────────


def test_update_storefront_edits_only_sent_fields(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", name="Acme", display_order=3)
    resp = client("admin1").put("/admin/storefronts/acme", json={"name": "Acme Two"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Acme Two"
    assert resp.json()["display_order"] == 3  # untouched


def test_update_storefront_leaves_product_count_untouched(aws, client):
    """product_count is the product routes' denormalized tally, not editable
    here — a text edit must never let it drift."""
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=4)
    resp = client("admin1").put("/admin/storefronts/acme", json={"name": "Renamed"})
    assert resp.json()["product_count"] == 4


def test_update_missing_storefront_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").put("/admin/storefronts/ghost", json={"name": "x"}).status_code == 404


# ── Delete: the has-products 409 contract ────────────────────────────────────


def test_delete_empty_storefront_roundtrips(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    assert client("admin1").delete("/admin/storefronts/acme").status_code == 204
    assert client("admin1").get("/storefronts").json() == []


def test_delete_storefront_with_products_is_409(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=1)
    aws.Table(PRODUCTS_TABLE).put_item(Item={"id": "p1", "storefront_id": "acme"})
    resp = client("admin1").delete("/admin/storefronts/acme")
    assert resp.status_code == 409
    # The store is still there — the delete refused.
    assert aws.Table(STOREFRONTS_TABLE).get_item(Key={"id": "acme"}).get("Item")


def test_delete_missing_storefront_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    assert client("admin1").delete("/admin/storefronts/ghost").status_code == 404


# ── Logo upload: the pending-claim photo lifecycle (step 17) ──────────────────


def test_create_storefront_claims_pending_logo(aws, client, monkeypatch):
    """A create carrying a pending logo key claims it into the permanent keyspace
    and returns a signed read of the permanent object."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    pending_key = "pending/storefront_logo/admin1/logo.jpg"
    permanent_key = "storefront_logo/admin1/logo.jpg"
    s3.put_object(Bucket=bucket, Key=pending_key, Body=b"img")

    resp = client("admin1").post(
        "/admin/storefronts", json=_new_store(id="acme", logo_url=bucket_url(bucket, pending_key))
    )
    assert resp.status_code == 201
    assert permanent_key in resp.json()["logo_url"]
    assert not head_exists(s3, bucket, pending_key)  # claimed out of pending
    assert head_exists(s3, bucket, permanent_key)  # ...into permanent


def test_update_storefront_replaces_logo(aws, client, monkeypatch):
    """Uploading a new logo on edit claims the new object and sweeps the old
    admin-uploaded one it replaces."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    old_key = "storefront_logo/admin1/old.jpg"
    s3.put_object(Bucket=bucket, Key=old_key, Body=b"old")
    put_storefront(aws, "acme")
    _set_logo(aws, "acme", bucket_url(bucket, old_key))

    new_pending = "pending/storefront_logo/admin1/new.jpg"
    new_permanent = "storefront_logo/admin1/new.jpg"
    s3.put_object(Bucket=bucket, Key=new_pending, Body=b"new")

    resp = client("admin1").put(
        "/admin/storefronts/acme", json={"logo_url": bucket_url(bucket, new_pending)}
    )
    assert resp.status_code == 200
    assert new_permanent in resp.json()["logo_url"]
    assert head_exists(s3, bucket, new_permanent)  # new claimed
    assert not head_exists(s3, bucket, new_pending)  # out of pending
    assert not head_exists(s3, bucket, old_key)  # old admin logo swept


def test_delete_storefront_sweeps_uploaded_logo(aws, client, monkeypatch):
    """Deleting an empty store sweeps its admin-uploaded logo object."""
    bucket, s3 = photos_bucket(monkeypatch)
    put_user(aws, "admin1", role="admin")

    logo_key = "storefront_logo/admin1/logo.jpg"
    s3.put_object(Bucket=bucket, Key=logo_key, Body=b"img")
    put_storefront(aws, "acme")
    _set_logo(aws, "acme", bucket_url(bucket, logo_key))

    assert client("admin1").delete("/admin/storefronts/acme").status_code == 204
    assert not head_exists(s3, bucket, logo_key)
