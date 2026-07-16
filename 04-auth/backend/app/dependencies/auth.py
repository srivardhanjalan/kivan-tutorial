import logging
from typing import Optional

import jwt as pyjwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
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
            "https://api.clerk.com/v1/jwks",
            headers={
                "Authorization": f"Bearer {settings.clerk_secret_key}",
                # Clerk's CDN rejects urllib's default agent with 403
                "User-Agent": "kivan-api/1.0",
            },
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
