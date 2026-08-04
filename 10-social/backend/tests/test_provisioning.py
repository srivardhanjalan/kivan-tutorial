"""JIT user provisioning writes the name-search key correctly, or omits it.

The bug this guards against: writing name_lowercase="" for a nameless signup.
name_lowercase is a String GSI key, so DynamoDB rejects the empty string and
the whole PutItem fails: a nameless user could never be provisioned and every
one of their authenticated requests 500ed. The fix is a sparse index: omit the
attribute entirely when there is no name. These tests exercise the real create
path against the real (moto) sparse index, so the empty-string write would fail
here exactly as it failed in production.
"""
from conftest import USERS_TABLE


def _profile(first_name, last_name):
    """A minimal Clerk Backend API user profile, enough for _create_user_record
    to resolve the primary email and the two name fields."""
    return {
        "first_name": first_name,
        "last_name": last_name,
        "image_url": None,
        "primary_email_address_id": "idn_1",
        "email_addresses": [
            {"id": "idn_1", "email_address": "person@example.com"}
        ],
    }


def _provision(monkeypatch, aws, user_id, first_name, last_name):
    """Run ensure_user_provisioned with the Clerk fetch stubbed, then return the
    raw DynamoDB item the create wrote (None if it wrote nothing)."""
    from app.utils import user_provisioning

    monkeypatch.setattr(
        user_provisioning,
        "_fetch_clerk_profile",
        lambda uid: _profile(first_name, last_name),
    )
    user_provisioning.ensure_user_provisioned({"sub": user_id})
    return aws.Table(USERS_TABLE).get_item(Key={"id": user_id}).get("Item")


def test_nameless_user_provisions_and_omits_name_lowercase(monkeypatch, aws):
    """(a) A signup with no name provisions successfully and the stored item
    carries NO name_lowercase attribute (sparse index). If the attribute were
    written as "", moto's GSI validation would raise and this call would fail."""
    item = _provision(monkeypatch, aws, "user_nameless", None, None)

    assert item is not None, "nameless user was not provisioned"
    assert "name_lowercase" not in item
    # The record still joins the popular/search partition and starts at zero.
    assert item["entity_type"] == "USER"
    assert item["follower_count"] == 0


def test_named_user_writes_lowercased_name(monkeypatch, aws):
    """(b) A signup with a name stores name_lowercase as lowercased "first
    last": the exact key NameSearchIndex prefix-matches on."""
    item = _provision(monkeypatch, aws, "user_named", "Ada", "Lovelace")

    assert item is not None
    assert item["name_lowercase"] == "ada lovelace"
