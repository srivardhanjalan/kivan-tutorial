"""The global user role (step 15) and its first readers: require_admin, the
admin router, and the grant_admin operator script.

Everything runs against the moto users table the shared fixtures build, with the
auth dependency overridden per request (conftest's `client` factory), so the
gate is exercised end to end with no JWT and no live Clerk call. The role field
carries NO data backfill by design — these prove the read-side default is
airtight: a record written before this step (no `role` attribute) reads and
gates exactly as an explicit "user" would.
"""
import importlib.util
from pathlib import Path

from conftest import USERS_TABLE, put_user

# The operator script lives in infra/scripts, outside the app package; load it
# by path so the test can drive grant_admin() against the moto table directly.
_GRANT_ADMIN_PATH = (
    Path(__file__).resolve().parents[2] / "infra" / "scripts" / "grant_admin.py"
)
_spec = importlib.util.spec_from_file_location("grant_admin", _GRANT_ADMIN_PATH)
grant_admin_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(grant_admin_mod)


# ── The role field: default on provision, safe default on old records ────────


def test_provisioning_sets_default_user_role(monkeypatch, aws):
    """A freshly provisioned user is written with role="user" — the default is
    set at creation, not left implicit."""
    from app.utils import user_provisioning

    monkeypatch.setattr(
        user_provisioning,
        "_fetch_clerk_profile",
        lambda uid: {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "image_url": None,
            "primary_email_address_id": "idn_1",
            "email_addresses": [{"id": "idn_1", "email_address": "ada@example.com"}],
        },
    )
    user_provisioning.ensure_user_provisioned({"sub": "user_new"})

    item = aws.Table(USERS_TABLE).get_item(Key={"id": "user_new"}).get("Item")
    assert item["role"] == "user"


def test_preexisting_record_without_role_reads_as_user(aws, client):
    """A record with NO role attribute (provisioned before step 15) serializes
    as role="user" through the admin list: the read-side default, no backfill."""
    put_user(aws, "admin1", role="admin")
    put_user(aws, "old_user", role=None)  # pre-step-15 shape: attribute absent

    resp = client("admin1").get("/admin/users")
    assert resp.status_code == 200
    by_id = {u["id"]: u for u in resp.json()}
    assert by_id["old_user"]["role"] == "user"


def test_missing_role_is_denied_by_the_gate(aws, client):
    """The same attribute-absent record is treated as non-admin: default-deny,
    so a pre-step-15 user cannot reach an admin route by lacking the field."""
    put_user(aws, "old_user", role=None)
    assert client("old_user").get("/admin/users").status_code == 403


# ── require_admin: non-admins are forbidden on every admin route ─────────────


def test_non_admin_forbidden_on_list(aws, client):
    put_user(aws, "plain", role="user")
    assert client("plain").get("/admin/users").status_code == 403


def test_non_admin_forbidden_on_role_patch(aws, client):
    put_user(aws, "plain", role="user")
    put_user(aws, "victim", role="user")
    resp = client("plain").patch("/admin/users/victim/role", json={"role": "admin"})
    assert resp.status_code == 403


# ── The admin surface: list, and the promote/demote round-trip ───────────────


def test_admin_lists_all_users(aws, client):
    put_user(aws, "admin1", role="admin")
    put_user(aws, "u1", role="user")
    put_user(aws, "u2", role=None)

    resp = client("admin1").get("/admin/users")
    assert resp.status_code == 200
    assert {u["id"] for u in resp.json()} == {"admin1", "u1", "u2"}


def test_admin_list_paginates(aws, client):
    put_user(aws, "admin1", role="admin")
    for i in range(5):
        put_user(aws, f"u{i}", role="user")

    page = client("admin1").get("/admin/users?limit=2&offset=0").json()
    assert len(page) == 2
    # A second page holds different ids — the slice actually advances.
    page2 = client("admin1").get("/admin/users?limit=2&offset=2").json()
    assert not ({u["id"] for u in page} & {u["id"] for u in page2})


def test_promote_then_demote_roundtrip(aws, client):
    put_user(aws, "admin1", role="admin")
    put_user(aws, "target", role="user")

    # Re-acquire the client before each request: `as_user` overrides the auth
    # dependency on the one shared app, so a handle held across a user switch
    # would run as whoever was set last.
    promoted = client("admin1").patch("/admin/users/target/role", json={"role": "admin"})
    assert promoted.status_code == 200
    assert promoted.json()["role"] == "admin"
    # The newly-promoted user can now reach an admin route themselves.
    assert client("target").get("/admin/users").status_code == 200

    demoted = client("admin1").patch("/admin/users/target/role", json={"role": "user"})
    assert demoted.status_code == 200
    assert demoted.json()["role"] == "user"
    assert client("target").get("/admin/users").status_code == 403


def test_admin_cannot_demote_themselves(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").patch("/admin/users/admin1/role", json={"role": "user"})
    assert resp.status_code == 409


def test_admin_can_reaffirm_own_admin_role(aws, client):
    """Setting your own role to "admin" is not self-demotion — it is allowed."""
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").patch("/admin/users/admin1/role", json={"role": "admin"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


def test_bogus_role_is_422(aws, client):
    put_user(aws, "admin1", role="admin")
    put_user(aws, "target", role="user")
    resp = client("admin1").patch(
        "/admin/users/target/role", json={"role": "superuser"}
    )
    assert resp.status_code == 422


def test_patch_missing_user_is_404(aws, client):
    put_user(aws, "admin1", role="admin")
    resp = client("admin1").patch("/admin/users/ghost/role", json={"role": "admin"})
    assert resp.status_code == 404


# ── The grant_admin operator script (the bootstrap for the first admin) ──────


def test_grant_admin_by_user_id(aws):
    put_user(aws, "user_boot", role="user")
    table = aws.Table(USERS_TABLE)

    updated = grant_admin_mod.grant_admin(table, user_id="user_boot")
    assert updated["role"] == "admin"
    assert table.get_item(Key={"id": "user_boot"}).get("Item")["role"] == "admin"


def test_script_granted_admin_passes_the_gate(aws, client):
    """The bootstrap chain end to end: a role-less record granted by the
    operator script passes require_admin on a real admin route. This is what
    enforces the script's claim that its ADMIN_ROLE literal matches the
    model's — if the two strings ever diverged, this test would 403."""
    put_user(aws, "user_boot", role=None)
    grant_admin_mod.grant_admin(aws.Table(USERS_TABLE), user_id="user_boot")

    assert client("user_boot").get("/admin/users").status_code == 200


def test_grant_admin_by_email(aws):
    put_user(aws, "user_boot", role=None)  # no role yet, resolved by email
    table = aws.Table(USERS_TABLE)

    updated = grant_admin_mod.grant_admin(table, email="user_boot@example.com")
    assert updated["role"] == "admin"


def test_grant_admin_unknown_target_raises(aws):
    table = aws.Table(USERS_TABLE)
    import pytest

    with pytest.raises(LookupError):
        grant_admin_mod.grant_admin(table, user_id="nope")
    with pytest.raises(LookupError):
        grant_admin_mod.grant_admin(table, email="nobody@example.com")


def test_grant_admin_requires_exactly_one_selector(aws):
    table = aws.Table(USERS_TABLE)
    import pytest

    with pytest.raises(ValueError):
        grant_admin_mod.grant_admin(table)
    with pytest.raises(ValueError):
        grant_admin_mod.grant_admin(table, user_id="x", email="y@example.com")
