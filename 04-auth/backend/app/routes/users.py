from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import users_table
from app.dependencies.auth import get_current_user_id
from app.models.users import OnboardingResponse, OnboardingStatus, User
from app.utils.timestamps import utc_now_iso

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
    return _get_user_or_404(user_id)


@router.get("/me/onboarding", response_model=OnboardingStatus)
def get_onboarding_status(user_id: str = Depends(get_current_user_id)):
    """Whether the current user has completed the first-run tutorial."""
    user_data = _get_user_or_404(user_id)
    return OnboardingStatus(
        onboarding_completed=user_data.get("onboarding_completed", False)
    )


@router.post("/me/onboarding/complete", response_model=OnboardingResponse)
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
    return OnboardingResponse(success=True, message="Onboarding completed successfully")
