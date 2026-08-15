"""Admin CRUD for catalog products (step 15 phase B).

Products nest under their store (a product belongs to exactly one), so the
routes carry storefront_id in the path and keep the store's denormalized
product_count in step. Runs against the moto tables the shared fixtures build,
with require_admin exercised end to end.
"""
from conftest import STOREFRONTS_TABLE, put_product, put_storefront, put_user


def _new_product(**overrides):
    body = {
        "id": "widget",
        "name": "Widget",
        "price": 19.99,
        "category": "Gadgets",
        "link_url": "https://example.com/widget",
    }
    body.update(overrides)
    return body


def _count(aws, storefront_id):
    item = aws.Table(STOREFRONTS_TABLE).get_item(Key={"id": storefront_id})["Item"]
    return int(item["product_count"])


# ── require_admin: non-admins are forbidden across the write surface ──────────


def test_non_admin_forbidden_on_create(aws, client):
    put_user(aws, "plain", role="user")
    put_storefront(aws, "acme")
    resp = client("plain").post("/admin/storefronts/acme/products", json=_new_product())
    assert resp.status_code == 403


def test_non_admin_forbidden_on_update(aws, client):
    put_user(aws, "plain", role="user")
    put_storefront(aws, "acme")
    put_product(aws, "widget", storefront_id="acme")
    resp = client("plain").put("/admin/storefronts/acme/products/widget", json={"name": "N"})
    assert resp.status_code == 403


def test_non_admin_forbidden_on_delete(aws, client):
    put_user(aws, "plain", role="user")
    put_storefront(aws, "acme")
    put_product(aws, "widget", storefront_id="acme")
    resp = client("plain").delete("/admin/storefronts/acme/products/widget")
    assert resp.status_code == 403


# ── Create ───────────────────────────────────────────────────────────────────


def test_create_product_roundtrips_and_counts(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=0)
    resp = client("admin1").post("/admin/storefronts/acme/products", json=_new_product())
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == "widget"
    assert body["price"] == 19.99  # Decimal stored, coerced back to float
    assert body["storefront_id"] == "acme"
    assert body["image_url"] is None  # no photo-upload UI yet
    # It lists under its store, and the store's tally moved up.
    listed = client("admin1").get("/storefronts/acme/products").json()
    assert {p["id"] for p in listed} == {"widget"}
    assert _count(aws, "acme") == 1


def test_create_product_under_missing_store_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").post("/admin/storefronts/ghost/products", json=_new_product())
    assert resp.status_code == 404
    # No phantom store was invented by an errant count bump: the store check
    # runs before any write, and adjust_count never ran.
    assert "Item" not in aws.Table(STOREFRONTS_TABLE).get_item(Key={"id": "ghost"})


def test_create_product_collision_is_409_and_leaves_count(aws, client):
    """A 409 must not bump the tally: adjust_count runs only after a safe put."""
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=1)
    put_product(aws, "widget", storefront_id="acme")
    resp = client("admin1").post("/admin/storefronts/acme/products", json=_new_product())
    assert resp.status_code == 409
    assert _count(aws, "acme") == 1  # unchanged


def test_create_product_missing_price_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    body = _new_product()
    del body["price"]
    assert client("admin1").post("/admin/storefronts/acme/products", json=body).status_code == 422


def test_create_product_negative_price_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    resp = client("admin1").post(
        "/admin/storefronts/acme/products", json=_new_product(price=-5)
    )
    assert resp.status_code == 422


# ── Update ───────────────────────────────────────────────────────────────────


def test_update_product_edits_price_and_leaves_count(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=1)
    put_product(aws, "widget", storefront_id="acme", price="1999")
    resp = client("admin1").put(
        "/admin/storefronts/acme/products/widget", json={"price": 24.5}
    )
    assert resp.status_code == 200
    assert resp.json()["price"] == 24.5
    assert _count(aws, "acme") == 1  # an edit never moves the tally


def test_update_product_empty_body_is_noop(aws, client):
    """An empty body returns the product unchanged (the route echoes the row it
    already fetched to confirm the store) and never moves the tally."""
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=1)
    put_product(aws, "widget", storefront_id="acme", name="Widget")
    resp = client("admin1").put("/admin/storefronts/acme/products/widget", json={})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Widget"
    assert _count(aws, "acme") == 1


def test_update_product_under_wrong_store_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    put_storefront(aws, "other")
    put_product(aws, "widget", storefront_id="acme")
    resp = client("admin1").put(
        "/admin/storefronts/other/products/widget", json={"name": "X"}
    )
    assert resp.status_code == 404


def test_update_missing_product_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    resp = client("admin1").put("/admin/storefronts/acme/products/ghost", json={"name": "X"})
    assert resp.status_code == 404


# ── Delete ───────────────────────────────────────────────────────────────────


def test_delete_product_roundtrips_and_decrements(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=1)
    put_product(aws, "widget", storefront_id="acme")
    assert client("admin1").delete("/admin/storefronts/acme/products/widget").status_code == 204
    assert client("admin1").get("/storefronts/acme/products").json() == []
    assert _count(aws, "acme") == 0


def test_delete_product_under_wrong_store_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    put_storefront(aws, "other")
    put_product(aws, "widget", storefront_id="acme")
    assert client("admin1").delete("/admin/storefronts/other/products/widget").status_code == 404


def test_delete_missing_product_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme")
    assert client("admin1").delete("/admin/storefronts/acme/products/ghost").status_code == 404


# ── The delete interlock: a store can't be deleted out from under a product ───


def test_store_delete_blocked_until_its_product_is_removed(aws, client):
    """create → store has a product → store delete 409; product delete → store
    delete 204. The count decrement and the has-products guard agree."""
    put_user(aws, "admin1", role="admin")
    put_storefront(aws, "acme", product_count=0)
    client("admin1").post("/admin/storefronts/acme/products", json=_new_product())

    assert client("admin1").delete("/admin/storefronts/acme").status_code == 409
    client("admin1").delete("/admin/storefronts/acme/products/widget")
    assert client("admin1").delete("/admin/storefronts/acme").status_code == 204
