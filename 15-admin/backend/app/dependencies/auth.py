import logging
from typing import Optional

import jwt as pyjwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import users_table
from app.models.users import ADMIN_ROLE, DEFAULT_ROLE
from app.utils.clerk_api import CLERK_API, clerk_headers
from app.utils.user_provisioning import ensure_user_provisioned

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Clerk publishes the instance's signing keys at the authenticated JWKS
# endpoint. PyJWKClient caches the key SET for `lifespan` seconds, so the
# hot path is networkless and a rotated key is picked up within the hour.
# (Not cache_keys=True — that's a per-kid lru_cache with no TTL, which
# would trust a revoked key until the process restarts.)
_jwks_client: Optional[pyjwt.PyJWKClient] = None


def _get_jwks_client() -> pyjwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = pyjwt.PyJWKClient(
            f"{CLERK_API}/jwks",
            # Clerk's CDN rejects urllib's default agent with 403
            headers={**clerk_headers(), "User-Agent": "kivan-api/1.0"},
            lifespan=3600,
        )
    return _jwks_client


# Deliberately sync (as is everything it calls): FastAPI runs sync
# dependencies in a threadpool, so the JWKS fetch, the Clerk profile call
# and DynamoDB I/O never block the event loop.
def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify a Clerk session JWT (signature, expiry) and return its claims.
    Also guarantees the user's DynamoDB record exists (JIT provisioning).
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication credentials provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        decoded = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,  # Clerk session tokens carry azp, not aud
                "require": ["exp", "sub"],  # absent claims must fail, not skip
            },
            leeway=5,  # small clock-skew allowance for nbf/iat/exp
        )
    except pyjwt.PyJWKClientConnectionError as e:
        # JWKS unreachable (Clerk outage, bad secret key) is OUR failure,
        # not the caller's — don't send readers debugging a valid token.
        logger.error(f"JWKS fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable",
        )
    except pyjwt.PyJWTError as e:
        # Includes non-connection PyJWKClientError: a token with a forged or
        # unknown kid is the CALLER's failure — 401, never 503
        logger.info(f"Rejected token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    ensure_user_provisioned(decoded)
    return decoded


def get_current_user_id(token_data: dict = Depends(verify_clerk_token)) -> str:
    """The authenticated user's id — routes depend on this directly."""
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user ID not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


def require_admin(user_id: str = Depends(get_current_user_id)) -> str:
    """Gate a route to admins, returning the caller's (admin) id for the route.

    The same shape as the step-14 access gate (utils/wishlist_access, with
    utils/user_access as the profile-side sibling): one GetItem, one boolean
    check, no new mechanism. Default-deny by construction — a missing row or a record
    without the `role` attribute reads as DEFAULT_ROLE, so only an explicit
    role == ADMIN_ROLE passes. That is exactly why a pre-step-15 record needs no
    backfill: absence of the attribute is denial, never accidental access.
    """
    response = users_table.get_item(Key={"id": user_id})
    user = response.get("Item")
    if not user or user.get("role", DEFAULT_ROLE) != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user_id
