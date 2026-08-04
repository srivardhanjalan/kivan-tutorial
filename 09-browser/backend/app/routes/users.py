import logging

import httpx
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import users_table, wishlists_table
from app.dependencies.auth import get_current_user_id
from app.models.users import AccountDeletionRequest, OnboardingStatus, User, UserUpdate
from app.utils.clerk_api import CLERK_API, CLERK_TIMEOUT, clerk_headers
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
    s3_key_from_url,
)
from app.utils.dynamo import get_item_or_404, query_all_pages
from app.utils.timestamps import utc_now_iso
from app.utils.user_provisioning import forget_user
from app.utils.wishlist_access import delete_wishlist_and_contents

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# Writes are guarded at the table, not just in code: the in-process
# "known users" cache is per-instance, so a deleted account could otherwise
# keep writing through instances that never saw the deletion.
_ACTIVE_CONDITION = "attribute_exists(id) AND (attribute_not_exists(is_deleted) OR is_deleted = :active)"


def _reject_write(user_id: str) -> HTTPException:
    """A guarded write failed its condition — say precisely why."""
    response = users_table.get_item(Key={"id": user_id})
    if "Item" in response and response["Item"].get("is_deleted", False):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deleted."
        )
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User profile not found"
    )


def _get_user_or_404(user_id: str) -> dict:
    """Fetch the user's DynamoDB record; 404 if it doesn't exist. The id is a
    Clerk-signed JWT sub, so the shared guard's empty/oversized check can
    never fire here — it rides along for free with the one get-or-404."""
    return get_item_or_404(users_table, user_id, "User profile not found")


def _get_active_user(user_id: str) -> dict:
    """Every read goes through this: 404 if missing, 403 if deleted —
    reads need the same deleted-account discipline as the guarded writes."""
    user_data = _get_user_or_404(user_id)
    if user_data.get("is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deleted."
        )
    return user_data


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@router.get("/me", response_model=User)
def get_current_user(user_id: str = Depends(get_current_user_id)):
    """The current user's profile — the record JIT provisioning created."""
    return _get_active_user(user_id)


@router.put("/me", response_model=User)
def update_current_user(
    user_update: UserUpdate, user_id: str = Depends(get_current_user_id)
):
    """Update the profile fields the body actually carries — nothing else."""
    update_parts = ["updated_at = :updated"]
    values: dict = {":updated": utc_now_iso()}

    # Only read the current record when a photo is changing — we need the old
    # URL to clean it up, and the read (like the guarded write below) 403s a
    # deleted account and 404s a missing one before anything is claimed.
    current_data = (
        _get_active_user(user_id)
        if user_update.image_url is not None or user_update.cover_photo is not None
        else None
    )

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
    # Photos: plan the change now (store the permanent URL), then run the S3
    # side-effects only AFTER the guarded write commits — so a rejected write
    # (deleted account) never promotes or deletes an object it shouldn't.
    to_claim: list[str] = []
    to_delete: list[str] = []
    planned_keys: set[str] = set()
    for column, alias, new_url in (
        ("image_url", ":img", user_update.image_url),
        ("cover_photo", ":cp", user_update.cover_photo),
    ):
        if new_url is None:
            continue
        stored, claim_url, delete_url = plan_photo_update(
            new_url, (current_data or {}).get(column), user_id
        )
        if stored is None:
            # A no-op echo (current object, or a pending URL already claimed
            # onto this field) — leave the field as-is
            continue
        stored_key = s3_key_from_url(stored)
        if stored_key is not None:
            # The same upload submitted for BOTH photo fields in one request:
            # each field plans independently, so this is the one aliasing
            # shape plan_photo_update can't see. One object, one field.
            # (External URLs carry no aliasing hazard and may repeat.)
            if stored_key in planned_keys:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each photo field needs its own upload",
                )
            planned_keys.add(stored_key)
        update_parts.append(f"{column} = {alias}")
        values[alias] = stored
        if claim_url:
            to_claim.append(claim_url)
        if delete_url:
            to_delete.append(delete_url)

    values[":active"] = False
    try:
        result = users_table.update_item(
            Key={"id": user_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeValues=values,
            # update_item is an upsert by default — never invent a record,
            # and never let a deleted account keep editing
            ConditionExpression=_ACTIVE_CONDITION,
            ReturnValues="ALL_NEW",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise _reject_write(user_id)
        raise

    # The write committed — now promote the new upload and sweep the replaced
    # object. Both are best-effort and logged: a failed promotion leaves the
    # pending copy for the lifecycle rule to reap (the photo would need
    # re-uploading), and a failed delete leaves at worst one stale object.
    for url in to_claim:
        claim_pending_photo(url)
    for url in to_delete:
        delete_photo_by_url(url)
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

    # Clerk FIRST: if this fails, nothing has changed and the user simply
    # retries. (Record-first would orphan a live Clerk account behind a
    # flagged record — deletable only from the dashboard.) Once Clerk
    # succeeds a re-run sees Clerk 404 and proceeds — but only while the
    # already-issued token lives (~1 min; no new one can be minted), so
    # everything after this point is best-effort or last, never blocking.
    try:
        response = httpx.delete(
            f"{CLERK_API}/users/{user_id}", headers=clerk_headers(), timeout=CLERK_TIMEOUT
        )
    except httpx.HTTPError as e:
        logger.error(f"Clerk unreachable deleting {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not delete the account right now — try again"
        )
    if response.status_code not in (200, 404):
        logger.error(f"Clerk deletion returned {response.status_code} for {user_id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not delete the account right now — try again"
        )

    # The account is now unrecoverable (Clerk login gone), so its personal
    # photos must not linger in S3: delete the objects (best-effort) and null
    # the fields in the same write that flags the record.
    delete_photo_by_url(user_data.get("image_url"))
    delete_photo_by_url(user_data.get("cover_photo"))

    # Tutorial-scoped: in this single-owner world a wishlist and its wishes
    # belong to exactly one account and nothing else references them, so a
    # deleted account's collections are swept outright — items and their
    # photos. (The user record itself is only flagged, not removed, because
    # later steps' data references it.) Step 14's co-ownership revisits what
    # deletion must preserve when a wishlist can outlive one of its owners.
    # Best-effort like the photo deletes above, and for the same reason: the
    # Clerk account is already gone, so nothing may stop the flag write below
    # from landing — a failed sweep leaves unreachable rows (no retry can
    # ever run: no login, no new token), which is residue, not access.
    try:
        owned_wishlists = query_all_pages(
            wishlists_table,
            IndexName="CreatedByIndex",
            KeyConditionExpression=Key("created_by").eq(user_id),
        )
        for wishlist in owned_wishlists:
            delete_wishlist_and_contents(wishlist)
    except Exception as e:
        logger.error(f"Wishlist sweep failed deleting {user_id}: {e}")

    # updated_at IS the deletion timestamp: the guarded writes freeze the
    # record at this instant, so a separate deleted_at would never differ
    users_table.update_item(
        Key={"id": user_id},
        UpdateExpression="SET is_deleted = :d, updated_at = :at, image_url = :none, cover_photo = :none",
        ExpressionAttributeValues={":d": True, ":at": utc_now_iso(), ":none": None},
    )
    # Without this, a deleted user cached as "known" skips the provisioning
    # guard until the process restarts (on this instance; writes are also
    # guarded at the table for every other instance)
    forget_user(user_id)


@router.get("/me/onboarding", response_model=OnboardingStatus)
def get_onboarding_status(user_id: str = Depends(get_current_user_id)):
    """Whether the current user has completed the first-run tutorial."""
    user_data = _get_active_user(user_id)
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
                ":active": False,
            },
            # Same guard as PUT: no invented records, no writes from the dead
            ConditionExpression=_ACTIVE_CONDITION,
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise _reject_write(user_id)
        raise
    # Echo the state the write just made true — no ceremony beyond that
    return OnboardingStatus(onboarding_completed=True)
