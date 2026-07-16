"""
Just-in-time user provisioning.

The DynamoDB user record is created server-side on the first authenticated
request, instead of trusting the client to call a sync endpoint after signup.
Profile data comes from the Clerk Backend API (server-to-server), so the client
can never assert another user's profile. Creation uses a conditional write and
is create-only: an existing user's profile is never overwritten.
"""
import logging

import httpx
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.config import settings
from app.database import users_table
from app.utils.timestamps import utc_now_iso

logger = logging.getLogger(__name__)

# User ids confirmed to exist in DynamoDB, cached to skip the existence
# check on every request. Process-lifetime: a fresh database or an
# interrupted signup self-heals on the next request, but a table rebuilt
# UNDER a running backend needs that backend restarted.
_known_user_ids: set = set()


def ensure_user_provisioned(token_claims: dict) -> None:
    """
    Guarantee a DynamoDB user record exists for the authenticated Clerk user.
    Called from the auth dependency after JWT verification.
    """
    user_id = token_claims.get("sub")
    if not user_id or user_id in _known_user_ids:
        return

    try:
        response = users_table.get_item(Key={"id": user_id})
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            # The number-one fresh-setup failure: name the fix, don't 500
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"DynamoDB table '{settings.users_table}' not found — "
                    "run terraform apply and set ENVIRONMENT to match"
                ),
            )
        raise

    if "Item" in response:
        _known_user_ids.add(user_id)
        return

    profile = _fetch_clerk_profile(user_id)
    _create_user_record(user_id, profile)
    _known_user_ids.add(user_id)


def _fetch_clerk_profile(user_id: str) -> dict:
    """Fetch the user's profile from the Clerk Backend API."""
    url = f"https://api.clerk.com/v1/users/{user_id}"
    headers = {"Authorization": f"Bearer {settings.clerk_secret_key}"}

    try:
        response = httpx.get(url, headers=headers, timeout=10.0)
    except httpx.HTTPError as e:
        logger.error(f"Clerk API unreachable while provisioning {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable"
        )

    if response.status_code == 404:
        # A verified JWT for a user Clerk doesn't know = deleted account
        logger.warning(f"Clerk has no user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in authentication service",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code != 200:
        # Rate limits and outages are Clerk's failure, not the caller's.
        # Log the status only — the body can carry profile PII.
        logger.error(f"Clerk API returned {response.status_code} for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable"
        )

    return response.json()


def _primary_email(profile: dict) -> str:
    """Resolve the primary email address from a Clerk user profile."""
    addresses = profile.get("email_addresses") or []
    primary_id = profile.get("primary_email_address_id")
    for addr in addresses:
        if addr.get("id") == primary_id:
            return addr.get("email_address", "")
    if addresses:
        return addresses[0].get("email_address", "")
    return ""


def _create_user_record(user_id: str, profile: dict) -> None:
    """
    Create the user record if it doesn't exist. A conditional write keeps
    this create-only: if a concurrent request won the race, that's fine.
    """
    email = _primary_email(profile)
    if not email:
        # Unreachable with this step's sign-in methods (email/password and
        # Google/Apple OAuth all carry an email; the Clerk instance requires
        # one) — this guards against a Clerk config drifting away from that.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must have at least one email address"
        )

    now = utc_now_iso()

    new_user = {
        "id": user_id,
        "email": email,
        "first_name": profile.get("first_name"),
        "last_name": profile.get("last_name"),
        "image_url": profile.get("image_url"),
        "onboarding_completed": False,
        "created_at": now,
        "updated_at": now,
    }

    try:
        users_table.put_item(
            Item=new_user,
            ConditionExpression="attribute_not_exists(id)"
        )
        logger.info(f"JIT-provisioned user {user_id}")
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
