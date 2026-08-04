"""Public access to another user's profile — the read side of the social step.

Distinct from users.py's own-account guards: those 403 a soft-deleted CURRENT
user (the caller is real, their account is gone). Looking at SOMEONE ELSE, a
deleted account is simply not there — 404, never 403, so a deletion can't be
probed by the status code it returns.
"""
from fastapi import HTTPException, status

from app.database import users_table
from app.utils.dynamo import get_item_or_404


def get_public_user(user_id: str) -> dict:
    """Fetch a user for public viewing: 404 if missing OR soft-deleted. The one
    spelling the follow graph, the loved-wishlists list, and the public profile
    all funnel through, so "does this user exist to others" is answered once."""
    user = get_item_or_404(users_table, user_id, "User not found")
    if user.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user
