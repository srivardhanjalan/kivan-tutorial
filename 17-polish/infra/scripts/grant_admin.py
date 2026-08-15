#!/usr/bin/env python3
"""
Grant a user the global admin role.

Step 15 is default-deny: no user is an admin until one is made so, and there is
no first admin to make the rest. This is that operator path. It writes
role="admin" straight onto the users table with your local AWS credentials, the
same out-of-band bootstrap the seed scripts use (the App Runner instance role
can read the roster but must not mint admins). There is deliberately no env-var
backdoor and no API bypass: an admin exists only because an operator ran this.

Usage (needs a python with boto3 — the backend venv this tutorial installs):
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        backend/.venv/bin/python infra/scripts/grant_admin.py --email you@example.com
    # or, when you already have the Clerk user id:
    AWS_REGION=us-east-1 ENVIRONMENT=production \
        backend/.venv/bin/python infra/scripts/grant_admin.py --user-id user_2ab...

Idempotent: re-granting an already-admin user is a harmless no-op. The write is
conditional on the record existing, so it never invents a row — a typo'd id or
email fails loudly instead of creating a phantom admin. Demotion is not this
script's job: use PATCH /admin/users/{id}/role once a first admin exists.

The role literal here matches app/models/users.ADMIN_ROLE (kept a plain string
so the script stays standalone like the seed scripts, importing no app config).
"""
import argparse
import os
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "us-east-1")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
USERS_TABLE = f"kivan-{ENVIRONMENT}-users"

# app/models/users.ADMIN_ROLE — the one value that grants access.
ADMIN_ROLE = "admin"


def _scan_by_email(table, email: str) -> list[dict]:
    """Resolve an email to user rows. The users table has no email GSI (only the
    name/popular indexes), so an operator one-off Scans with a filter — honest
    here, where it runs once by hand, though it would be wrong on a hot path."""
    matches: list[dict] = []
    kwargs = {"FilterExpression": Attr("email").eq(email)}
    response = table.scan(**kwargs)
    matches.extend(response.get("Items", []))
    while "LastEvaluatedKey" in response:
        response = table.scan(**kwargs, ExclusiveStartKey=response["LastEvaluatedKey"])
        matches.extend(response.get("Items", []))
    return matches


def grant_admin(table, *, email: str | None = None, user_id: str | None = None) -> dict:
    """Set role=admin on exactly one existing user, resolved by id or email.

    Raises LookupError if the target can't be resolved to a single existing
    row (no match, an ambiguous email, or an id that isn't there), so the
    caller never silently grants the wrong account. Returns the updated item.
    """
    if bool(email) == bool(user_id):
        raise ValueError("Pass exactly one of email or user_id")

    if email:
        matches = _scan_by_email(table, email)
        if not matches:
            raise LookupError(f"No user with email {email!r}")
        if len(matches) > 1:
            raise LookupError(
                f"{len(matches)} users share email {email!r}; grant by --user-id"
            )
        user_id = matches[0]["id"]

    try:
        result = table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET #r = :admin, updated_at = :now",
            ConditionExpression="attribute_exists(id)",  # never invent a row
            ExpressionAttributeNames={"#r": "role"},
            ExpressionAttributeValues={
                ":admin": ADMIN_ROLE,
                ":now": datetime.now(timezone.utc).isoformat(),
            },
            ReturnValues="ALL_NEW",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise LookupError(f"No user with id {user_id!r}")
        raise
    return result["Attributes"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Grant a user the admin role.")
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--email", help="the user's primary email address")
    target.add_argument("--user-id", dest="user_id", help="the Clerk user id")
    args = parser.parse_args()

    table = boto3.resource("dynamodb", region_name=REGION).Table(USERS_TABLE)
    user = grant_admin(table, email=args.email, user_id=args.user_id)
    print(f"✅ {user['id']} ({user.get('email', 'no email')}) is now an admin")


if __name__ == "__main__":
    main()
