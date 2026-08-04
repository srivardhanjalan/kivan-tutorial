import logging

import httpx
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import followers_table, users_table, wishlists_table
from app.dependencies.auth import get_current_user_id
from app.models.users import (
    AccountDeletionRequest,
    OnboardingStatus,
    User,
    UserUpdate,
    UserWithCounts,
)
from app.models.wishlists import Wishlist
from app.utils.clerk_api import CLERK_API, CLERK_TIMEOUT, clerk_headers
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
    s3_key_from_url,
)
from app.utils.dynamo import get_item_or_404, query_all_pages
from app.utils.timestamps import utc_now_iso
from app.utils.user_access import get_public_user
from app.utils.user_provisioning import forget_user
from app.utils.user_search import name_lowercase
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
    remove_parts: list[str] = []
    values: dict = {":updated": utc_now_iso()}

    # Read the current record when a photo is changing (we need the old URL to
    # clean it up) OR when a name is changing (name_lowercase is rebuilt from
    # BOTH names, so a one-field rename needs the other from the record). The
    # read (like the guarded write below) 403s a deleted account and 404s a
    # missing one before anything is claimed.
    name_changing = (
        user_update.first_name is not None or user_update.last_name is not None
    )
    current_data = (
        _get_active_user(user_id)
        if user_update.image_url is not None
        or user_update.cover_photo is not None
        or name_changing
        else None
    )

    if user_update.first_name is not None:
        update_parts.append("first_name = :fn")
        values[":fn"] = user_update.first_name
    if user_update.last_name is not None:
        update_parts.append("last_name = :ln")
        values[":ln"] = user_update.last_name
    # A name change must move name_lowercase in the SAME write, or a renamed
    # user drops out of typeahead search until their next edit. Rebuild from the
    # incoming field plus the untouched one on the record. NameSearchIndex is
    # sparse and its key cannot hold "", so clearing the name REMOVEs the
    # attribute (dropping the user from name search) instead of writing "".
    if name_changing:
        new_first = (
            user_update.first_name
            if user_update.first_name is not None
            else current_data.get("first_name")
        )
        new_last = (
            user_update.last_name
            if user_update.last_name is not None
            else current_data.get("last_name")
        )
        new_name_lowercase = name_lowercase(new_first, new_last)
        if new_name_lowercase:
            update_parts.append("name_lowercase = :nl")
            values[":nl"] = new_name_lowercase
        else:
            remove_parts.append("name_lowercase")
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
    update_expression = "SET " + ", ".join(update_parts)
    if remove_parts:
        update_expression += " REMOVE " + ", ".join(remove_parts)
    try:
        result = users_table.update_item(
            Key={"id": user_id},
            UpdateExpression=update_expression,
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


# ── Social reads (step 10) ──────────────────────────────────────────────────
# These live below the /me routes so those literal paths match first, and above
# the catch-all /{user_id} so "search"/"popular" are never read as a user id.


def _active(users: list[dict]) -> list[dict]:
    """Drop soft-deleted accounts from an index read: they stay in the table
    for referential integrity but must never surface in search or Discover."""
    return [u for u in users if not u.get("is_deleted", False)]


@router.get("/search", response_model=list[User])
def search_users(
    q: str,
    limit: int = Query(default=10, ge=1, le=50),
    _viewer: str = Depends(get_current_user_id),
):
    """Typeahead search by name. A prefix Query on NameSearchIndex (all users
    share the "USER" partition, name_lowercase is the sort key), never a Scan.
    An empty query returns nothing: the client shows the popular rail instead."""
    prefix = q.strip().lower()
    if not prefix:
        return []
    response = users_table.query(
        IndexName="NameSearchIndex",
        KeyConditionExpression=Key("entity_type").eq("USER")
        & Key("name_lowercase").begins_with(prefix),
        Limit=limit,
    )
    return _active(response.get("Items", []))


@router.get("/popular", response_model=list[UserWithCounts])
def get_popular_users(
    limit: int = Query(default=10, ge=1, le=50),
    _viewer: str = Depends(get_current_user_id),
):
    """Discover's default rail: the most-followed users. A Query on
    PopularUsersIndex in descending follower_count order returns them
    pre-sorted; we read the index (small at this app's scale), drop deleted
    accounts, and take the top `limit`. is_following is left unset here: the
    rows navigate to a profile, where the real follow state is fetched."""
    ranked = query_all_pages(
        users_table,
        IndexName="PopularUsersIndex",
        KeyConditionExpression=Key("entity_type").eq("USER"),
        ScanIndexForward=False,  # highest follower_count first
    )
    return [UserWithCounts(**u) for u in _active(ranked)[:limit]]


@router.get("/{user_id}", response_model=UserWithCounts)
def get_user(user_id: str, viewer_id: str = Depends(get_current_user_id)):
    """A user's public profile: their record, denormalized counts, and, unless
    you're looking at yourself, whether you follow them (a single GetItem on
    the follow edge). 404 if the user is missing or a deleted account."""
    user = get_public_user(user_id)
    is_following = None
    if viewer_id != user_id:
        edge = followers_table.get_item(
            Key={"follower_id": viewer_id, "following_id": user_id}
        )
        is_following = "Item" in edge
    return UserWithCounts(**user, is_following=is_following)


@router.get("/{user_id}/wishlists", response_model=list[Wishlist])
def get_user_wishlists(user_id: str, _viewer: str = Depends(get_current_user_id)):
    """A user's wishlists, newest first: the public read behind their profile.
    Every wishlist is viewable this step (privacy is step 14); the same
    CreatedByIndex Query as GET /wishlists/me, just for another user."""
    get_public_user(user_id)
    items = query_all_pages(
        wishlists_table,
        IndexName="CreatedByIndex",
        KeyConditionExpression=Key("created_by").eq(user_id),
    )
    items.sort(key=lambda w: w["created_at"], reverse=True)
    return items
