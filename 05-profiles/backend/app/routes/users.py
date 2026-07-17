import logging

import httpx
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.config import settings
from app.database import users_table
from app.dependencies.auth import get_current_user_id
from app.models.users import AccountDeletionRequest, OnboardingStatus, User, UserUpdate
from app.utils.timestamps import utc_now_iso
from app.utils.user_provisioning import forget_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


def _get_user_or_404(user_id: str) -> dict:
    """Fetch the user's DynamoDB record; 404 if it doesn't exist."""
    response = users_table.get_item(Key={"id": user_id})
    if "Item" not in response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    return response["Item"]


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@router.get("/me", response_model=User)
def get_current_user(user_id: str = Depends(get_current_user_id)):
    """The current user's profile — the record JIT provisioning created."""
    user_data = _get_user_or_404(user_id)
    if user_data.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deleted."
        )
    return user_data


@router.put("/me", response_model=User)
def update_current_user(
    user_update: UserUpdate, user_id: str = Depends(get_current_user_id)
):
    """Update the profile fields the body actually carries — nothing else."""
    update_parts = ["updated_at = :updated"]
    values: dict = {":updated": utc_now_iso()}

    if user_update.first_name is not None:
        update_parts.append("first_name = :fn")
        values[":fn"] = user_update.first_name
    if user_update.last_name is not None:
        update_parts.append("last_name = :ln")
        values[":ln"] = user_update.last_name
    if user_update.birthday is not None:
        update_parts.append("birthday = :bd")
        values[":bd"] = user_update.birthday.isoformat()
    if user_update.birthday_prompt_dismissed is not None:
        update_parts.append("birthday_prompt_dismissed = :bpd")
        values[":bpd"] = user_update.birthday_prompt_dismissed

    try:
        result = users_table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeValues=values,
            # update_item is an upsert by default — never let this endpoint
            # invent a partial user record
            ConditionExpression="attribute_exists(id)",
            ReturnValues="ALL_NEW",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        raise
    return result["Attributes"]


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(
    deletion: AccountDeletionRequest, user_id: str = Depends(get_current_user_id)
):
    """
    Soft-delete the account: the record is flagged (never removed — later
    steps' data will reference it), then the Clerk user is deleted so the
    credentials stop working everywhere.
    """
    if deletion.confirmation_text != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Type "DELETE" to confirm account deletion'
        )

    user_data = _get_user_or_404(user_id)
    if user_data.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account is already deleted."
        )

    now = utc_now_iso()
    users_table.update_item(
        Key={"id": user_id},
        UpdateExpression="SET is_deleted = :d, deleted_at = :at, updated_at = :at",
        ExpressionAttributeValues={":d": True, ":at": now},
    )
    # Without this, a deleted user cached as "known" skips the provisioning
    # guard until the process restarts
    forget_user(user_id)

    # Clerk second, record first: if this call fails, the flagged record
    # still 403s every future request (provisioning + /me guards).
    try:
        response = httpx.delete(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            timeout=10.0,
        )
        if response.status_code not in (200, 404):
            logger.error(
                f"Clerk deletion returned {response.status_code} for {user_id}"
            )
    except httpx.HTTPError as e:
        logger.error(f"Clerk unreachable deleting {user_id}: {e}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/onboarding", response_model=OnboardingStatus)
def get_onboarding_status(user_id: str = Depends(get_current_user_id)):
    """Whether the current user has completed the first-run tutorial."""
    user_data = _get_user_or_404(user_id)
    return OnboardingStatus(
        onboarding_completed=user_data.get("onboarding_completed", False)
    )


@router.post("/me/onboarding/complete", response_model=OnboardingStatus)
def complete_onboarding(user_id: str = Depends(get_current_user_id)):
    """Mark the first-run tutorial as completed for the current user."""
    try:
        users_table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET onboarding_completed = :completed, updated_at = :updated",
            ExpressionAttributeValues={
                ":completed": True,
                ":updated": utc_now_iso(),
            },
            # update_item is an upsert by default — never let this endpoint
            # invent a partial user record
            ConditionExpression="attribute_exists(id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        raise
    # Echo the state the write just made true — no ceremony beyond that
    return OnboardingStatus(onboarding_completed=True)
