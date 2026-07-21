"""The one spelling of how this backend calls the Clerk Backend API."""
from app.config import settings

CLERK_API = "https://api.clerk.com/v1"
CLERK_TIMEOUT = 10.0


def clerk_headers() -> dict:
    return {"Authorization": f"Bearer {settings.clerk_secret_key}"}
