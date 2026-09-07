"""
Step 15 — admin catalog (PR #100 proof list).

Admin is granted by writing role=admin onto the user's row (the same effect the
operator grant_admin.py script has, done here as a direct table write so the
suite is re-runnable without a subprocess). Default-deny for a role-less user;
the promote/demote round-trip with its self-demote 409; the full 403 sweep over
every admin-gated route; and catalog CRUD with the collision / in-use 409s.
"""
import uuid

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step15]


def test_grant_admin_and_default_deny(clerk_user, grant_admin):
    plain = clerk_user("Pat", "Plain")
    me = plain.client.get("/users/me")
    assert me.status_code == 200
    assert me.json()["role"] == "user"           # default-deny: no role attr → user
    assert plain.client.get("/admin/users").status_code == 403

    admin = clerk_user("Ada", "Admin")
    grant_admin(admin)
    assert admin.client.get("/admin/users").status_code == 200


def test_role_round_trip(clerk_user, grant_admin):
    admin = clerk_user("Rex", "Root")
    target = clerk_user("Tara", "Target")
    grant_admin(admin)
    assert target.client.get("/users/me").status_code == 200  # provision the row

    # promote
    up = admin.client.patch(f"/admin/users/{target.user_id}/role", json={"role": "admin"})
    assert up.status_code == 200 and up.json()["role"] == "admin"
    assert target.client.get("/admin/users").status_code == 200

    # demote
    down = admin.client.patch(f"/admin/users/{target.user_id}/role", json={"role": "user"})
    assert down.status_code == 200 and down.json()["role"] == "user"
    assert target.client.get("/admin/users").status_code == 403

    # guards
    assert admin.client.patch(f"/admin/users/{admin.user_id}/role",
                              json={"role": "user"}).status_code == 409   # self-demote
    assert admin.client.patch(f"/admin/users/{target.user_id}/role",
                              json={"role": "superuser"}).status_code == 422  # bogus role
    assert admin.client.patch("/admin/users/user_ghost/role",
                              json={"role": "admin"}).status_code == 404   # unknown user


def test_admin_routes_403_sweep(clerk_user):
    plain = clerk_user("Nora", "NonAdmin")
    routes = [
        ("get", "/admin/users", None),
        ("patch", "/admin/users/x/role", {"role": "admin"}),
        ("post", "/admin/brands", {}),
        ("put", "/admin/brands/x", {}),
        ("delete", "/admin/brands/x", None),
        ("post", "/admin/life-events", {}),
        ("put", "/admin/life-events/x", {}),
        ("delete", "/admin/life-events/x", None),
        ("post", "/admin/storefronts", {}),
        ("put", "/admin/storefronts/x", {}),
        ("delete", "/admin/storefronts/x", None),
        ("post", "/admin/storefronts/x/products", {}),
        ("put", "/admin/storefronts/x/products/y", {}),
        ("delete", "/admin/storefronts/x/products/y", None),
    ]
    for method, path, body in routes:
        kwargs = {"json": body} if body is not None else {}
        resp = getattr(plain.client, method)(path, **kwargs)
        assert resp.status_code == 403, f"{method.upper()} {path} → {resp.status_code}, want 403 (gate preempts body)"


def test_brand_crud_and_collision_409(clerk_user, grant_admin):
    admin = clerk_user("Bree", "BrandAdmin")
    grant_admin(admin)
    bid = f"brand-{uuid.uuid4().hex[:8]}"
    body = {"id": bid, "name": "Acme", "website_url": "https://acme.test",
            "category": "general", "country": "US"}
    created = admin.client.post("/admin/brands", json=body)
    assert created.status_code == 201
    try:
        assert bid in [b["id"] for b in admin.client.get("/brands").json()]
        assert admin.client.put(f"/admin/brands/{bid}", json={"name": "Acme Corp"}).status_code == 200
        assert admin.client.post("/admin/brands", json=body).status_code == 409  # duplicate id
        assert admin.client.delete(f"/admin/brands/{bid}").status_code == 204
        assert bid not in [b["id"] for b in admin.client.get("/brands").json()]
    finally:
        admin.client.delete(f"/admin/brands/{bid}")  # best-effort if an assert bailed early


def test_life_event_in_use_delete_409(clerk_user, grant_admin):
    admin = clerk_user("Lena", "LifeAdmin")
    grant_admin(admin)
    leid = f"le-{uuid.uuid4().hex[:8]}"
    assert admin.client.post("/admin/life-events",
                             json={"id": leid, "name": "Graduation"}).status_code == 201
    wid = None
    try:
        wl = admin.client.post("/wishlists/", json={"name": "Grad gifts", "life_event_id": leid})
        assert wl.status_code == 201
        wid = wl.json()["id"]
        # referenced by a wishlist → cannot delete
        assert admin.client.delete(f"/admin/life-events/{leid}").status_code == 409
        assert admin.client.delete(f"/wishlists/{wid}").status_code == 204
        wid = None
        # now unreferenced → deletable
        assert admin.client.delete(f"/admin/life-events/{leid}").status_code == 204
    finally:
        if wid:
            admin.client.delete(f"/wishlists/{wid}")
        admin.client.delete(f"/admin/life-events/{leid}")


def test_storefront_product_crud_and_409(clerk_user, grant_admin):
    admin = clerk_user("Sven", "StoreAdmin")
    grant_admin(admin)
    sid = f"store-{uuid.uuid4().hex[:8]}"
    pid = f"prod-{uuid.uuid4().hex[:8]}"
    sf = admin.client.post("/admin/storefronts", json={"id": sid, "name": "Corner Shop"})
    assert sf.status_code == 201
    assert sf.json()["product_count"] == 0
    try:
        # negative price is rejected before anything is written
        assert admin.client.post(f"/admin/storefronts/{sid}/products",
                                 json={"id": pid, "name": "Widget", "price": -5,
                                       "category": "misc", "link_url": "https://x.test"}).status_code == 422

        prod = admin.client.post(f"/admin/storefronts/{sid}/products",
                                 json={"id": pid, "name": "Widget", "price": 9.99,
                                       "category": "misc", "link_url": "https://x.test"})
        assert prod.status_code == 201
        # product_count denormalized up on the storefront
        assert admin.client.get("/storefronts").json()  # readable
        assert any(s["id"] == sid and s["product_count"] == 1
                   for s in admin.client.get("/storefronts").json())

        # storefront with products cannot be deleted
        assert admin.client.delete(f"/admin/storefronts/{sid}").status_code == 409
        assert admin.client.delete(f"/admin/storefronts/{sid}/products/{pid}").status_code == 204
        # now empty → deletable
        assert admin.client.delete(f"/admin/storefronts/{sid}").status_code == 204
    finally:
        admin.client.delete(f"/admin/storefronts/{sid}/products/{pid}")
        admin.client.delete(f"/admin/storefronts/{sid}")
