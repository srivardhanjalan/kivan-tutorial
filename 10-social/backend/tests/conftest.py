"""Shared fixtures for the backend test suite.

Everything DynamoDB-facing runs against moto's in-memory emulation (mock_aws),
so the suite needs no AWS account and no network. The table fixtures below
mirror infra/dynamodb.tf exactly: same hash/range keys, same GSIs, same key
types. That is deliberate. A schema that drifts from the real one would let a
test pass against a table the deploy could never create (the empty-key GSI bug
that 500ed nameless signups was invisible until a test ran the REAL sparse
index). Read these fixtures as the schema contract the routes are written for.
"""
import os
import sys

# The app package reads required settings (Clerk, Firecrawl) at import time and
# resolves table names from ENVIRONMENT, so these must be set BEFORE anything
# under app/ is imported: hence module top, not a fixture. The AWS values are
# moto placeholders: real credentials would let a mis-scoped call escape to a
# live account, so the suite pins fake ones.
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_dummy")
os.environ.setdefault("FIRECRAWL_API_KEY", "fc_test_dummy")

# Make the `app` package importable no matter which directory pytest is invoked
# from (the tests dir is what pytest puts on sys.path by default, not backend/).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from moto import mock_aws  # noqa: E402

# The one place the tests spell the env → table-name mapping, so a rename in
# config.py surfaces here instead of as a silent "table not found".
ENVIRONMENT = os.environ["ENVIRONMENT"]
USERS_TABLE = f"kivan-{ENVIRONMENT}-users"
WISHLISTS_TABLE = f"kivan-{ENVIRONMENT}-wishlists"
FOLLOWERS_TABLE = f"kivan-{ENVIRONMENT}-followers"
WISHLIST_LOVES_TABLE = f"kivan-{ENVIRONMENT}-wishlist-loves"


def _create_tables(client) -> None:
    """Create exactly the four tables the tested routes touch, each a faithful
    copy of its infra/dynamodb.tf definition. Reference tables (life-events,
    storefronts, brands, products) and the wishes table are omitted: no code
    path under test reads them, and a table without a caller is bloat here just
    as it would be in the app."""
    # Users: hash id; NameSearchIndex (typeahead prefix search) and
    # PopularUsersIndex (Discover rail) both hash on the constant entity_type.
    # NameSearchIndex is SPARSE: name_lowercase is a String key, so DynamoDB
    # (and moto) reject an empty-string value: the exact constraint that makes
    # a nameless user un-provisionable unless the attribute is OMITTED.
    client.create_table(
        TableName=USERS_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "id", "AttributeType": "S"},
            {"AttributeName": "entity_type", "AttributeType": "S"},
            {"AttributeName": "name_lowercase", "AttributeType": "S"},
            {"AttributeName": "follower_count", "AttributeType": "N"},
        ],
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "NameSearchIndex",
                "KeySchema": [
                    {"AttributeName": "entity_type", "KeyType": "HASH"},
                    {"AttributeName": "name_lowercase", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "PopularUsersIndex",
                "KeySchema": [
                    {"AttributeName": "entity_type", "KeyType": "HASH"},
                    {"AttributeName": "follower_count", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    )
    # Wishlists: hash id; CreatedByIndex (a user's own wishlists) and
    # PopularWishlistsIndex (most-loved rail, hashed on the constant entity_type
    # and ranked by love_count).
    client.create_table(
        TableName=WISHLISTS_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "id", "AttributeType": "S"},
            {"AttributeName": "created_by", "AttributeType": "S"},
            {"AttributeName": "entity_type", "AttributeType": "S"},
            {"AttributeName": "love_count", "AttributeType": "N"},
        ],
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "CreatedByIndex",
                "KeySchema": [{"AttributeName": "created_by", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "PopularWishlistsIndex",
                "KeySchema": [
                    {"AttributeName": "entity_type", "KeyType": "HASH"},
                    {"AttributeName": "love_count", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    )
    # Followers: one row per follow edge, keyed (follower_id, following_id);
    # FollowingIndex flips the edge to answer "who follows X".
    client.create_table(
        TableName=FOLLOWERS_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "follower_id", "AttributeType": "S"},
            {"AttributeName": "following_id", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "follower_id", "KeyType": "HASH"},
            {"AttributeName": "following_id", "KeyType": "RANGE"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "FollowingIndex",
                "KeySchema": [{"AttributeName": "following_id", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "KEYS_ONLY"},
            }
        ],
    )
    # Wishlist-loves: one row per love edge, keyed (user_id, wishlist_id);
    # no GSI (base-table Query answers "wishlists this user loves").
    client.create_table(
        TableName=WISHLIST_LOVES_TABLE,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "wishlist_id", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "wishlist_id", "KeyType": "RANGE"},
        ],
    )


@pytest.fixture
def aws(monkeypatch):
    """A fresh moto backend with the four tables, torn down after each test.

    Also clears the module-level provisioning cache: it is process-lifetime, so
    a user id remembered by one test would let ensure_user_provisioned skip the
    existence check against the next test's empty table."""
    with mock_aws():
        client = boto3.client("dynamodb", region_name="us-east-1")
        _create_tables(client)

        # Import lazily and inside the mock so the app's boto3 handles resolve
        # against this backend, and clear the known-ids cache for isolation.
        from app.utils import user_provisioning

        user_provisioning._known_user_ids.clear()

        resource = boto3.resource("dynamodb", region_name="us-east-1")
        yield resource


@pytest.fixture
def client(aws):
    """A TestClient factory that stands in for Clerk auth: as_user(uid) makes
    every request authenticate as that user id by overriding the auth
    dependency, so the routes run with no JWT and no live Clerk call."""
    from app.dependencies.auth import get_current_user_id
    from app.main import app

    def as_user(user_id: str) -> TestClient:
        app.dependency_overrides[get_current_user_id] = lambda: user_id
        return TestClient(app)

    yield as_user
    app.dependency_overrides.clear()


# ── Seed helpers ────────────────────────────────────────────────────────────
# Build complete records the response models can validate (email, created_at
# and updated_at are required on User; the popular/search routes serialize what
# these write). name_lowercase is set only for a named user: the sparse-index
# discipline the app itself follows.


def put_user(
    aws,
    user_id: str,
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    follower_count: int = 0,
    is_deleted: bool = False,
):
    item = {
        "id": user_id,
        "email": f"{user_id}@example.com",
        "first_name": first_name,
        "last_name": last_name,
        "entity_type": "USER",
        "follower_count": follower_count,
        "following_count": 0,
        "onboarding_completed": True,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    if is_deleted:
        item["is_deleted"] = True
    name = f"{first_name or ''} {last_name or ''}".strip().lower()
    if name:
        item["name_lowercase"] = name
    aws.Table(USERS_TABLE).put_item(Item=item)
    return item


def put_wishlist(
    aws,
    wishlist_id: str,
    *,
    created_by: str,
    name: str = "A wishlist",
    love_count: int = 0,
):
    item = {
        "id": wishlist_id,
        "name": name,
        "life_event_id": "general",
        "created_by": created_by,
        "entity_type": "WISHLIST",
        "love_count": love_count,
        "created_at": "2026-01-01T00:00:00+00:00",
    }
    aws.Table(WISHLISTS_TABLE).put_item(Item=item)
    return item
