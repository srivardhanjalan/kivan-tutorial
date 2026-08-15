"""One denial sweep over the WHOLE admin surface (step 15 phases A + B).

require_admin runs before any route body, so a non-admin is refused regardless
of whether the target row exists — no seeding needed beyond the caller. This is
the single place that asserts "every admin route denies a non-admin"; the
per-domain files carry the deeper contracts. If a new admin route is added
without a gate, this catches it the moment its (method, path) joins the list.
"""
import pytest

from conftest import put_user

# Every admin route, one row each. Paths use stand-in ids: the gate fires first,
# so a 403 comes back before the id is ever looked at.
ADMIN_ROUTES = [
    # Phase A: users
    ("get", "/admin/users"),
    ("patch", "/admin/users/u1/role"),
    # Phase B: brands
    ("post", "/admin/brands"),
    ("put", "/admin/brands/b1"),
    ("delete", "/admin/brands/b1"),
    # Phase B: life events
    ("post", "/admin/life-events"),
    ("put", "/admin/life-events/le1"),
    ("delete", "/admin/life-events/le1"),
    # Phase B: storefronts
    ("post", "/admin/storefronts"),
    ("put", "/admin/storefronts/s1"),
    ("delete", "/admin/storefronts/s1"),
    # Phase B: products (nested under their store)
    ("post", "/admin/storefronts/s1/products"),
    ("put", "/admin/storefronts/s1/products/p1"),
    ("delete", "/admin/storefronts/s1/products/p1"),
]


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_non_admin_is_forbidden_everywhere(aws, client, method, path):
    put_user(aws, "plain", role="user")
    resp = client("plain").request(method, path, json={})
    assert resp.status_code == 403, f"{method.upper()} {path} did not 403 a non-admin"


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_role_absent_record_is_forbidden_everywhere(aws, client, method, path):
    """A pre-step-15 record with no role attribute is denied too: default-deny,
    so the absence of the field can never reach an admin route."""
    put_user(aws, "old_user", role=None)
    resp = client("old_user").request(method, path, json={})
    assert resp.status_code == 403, f"{method.upper()} {path} did not 403 a role-less caller"
