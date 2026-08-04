from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import followers_table, users_table
from app.dependencies.auth import get_current_user_id
from app.models.users import User
from app.utils.dynamo import adjust_count, batch_get_items, query_all_pages
from app.utils.user_access import get_public_user

# The follow graph hangs off /users/{id}, so it shares that prefix but keeps its
# own file: following is one concern, the profile CRUD in users.py another.
router = APIRouter(prefix="/users", tags=["followers"])


def _users_for_ids(ids: list[str]) -> list[User]:
    """Resolve a list of user ids to public User records in the given order,
    dropping soft-deleted accounts. One BatchGetItem instead of N GetItems:
    the id list comes from an edge query, so this is the join back to profiles."""
    unique_ids = list(dict.fromkeys(ids))  # dedupe, preserve first-seen order
    if not unique_ids:
        return []
    by_id = {
        item["id"]: item
        for item in batch_get_items(users_table, [{"id": uid} for uid in unique_ids])
    }
    return [
        User(**by_id[uid])
        for uid in unique_ids
        if uid in by_id and not by_id[uid].get("is_deleted", False)
    ]


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@router.post("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(user_id: str, follower_id: str = Depends(get_current_user_id)):
    """Follow a user. Idempotent: a conditional put makes the edge exist exactly
    once, so a repeat follow is a no-op 204 that never double-counts. The
    denormalized counts move only when the edge is actually new."""
    if user_id == follower_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot follow yourself"
        )
    get_public_user(user_id)

    try:
        followers_table.put_item(
            Item={"follower_id": follower_id, "following_id": user_id},
            # Only the FIRST follow writes the edge; a repeat fails the condition
            ConditionExpression="attribute_not_exists(follower_id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return  # already following: idempotent success, counts untouched
        raise

    # The edge is new: bump the followed user's followers and the caller's
    # following (best-effort: the edge above is the source of truth)
    adjust_count(users_table, {"id": user_id}, "follower_count", 1)
    adjust_count(users_table, {"id": follower_id}, "following_count", 1)


@router.delete("/{user_id}/unfollow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(user_id: str, follower_id: str = Depends(get_current_user_id)):
    """Unfollow a user. Idempotent mirror of follow: a conditional delete only
    fires when the edge exists, so counts move exactly once and a repeat
    unfollow is a harmless 204."""
    try:
        followers_table.delete_item(
            Key={"follower_id": follower_id, "following_id": user_id},
            ConditionExpression="attribute_exists(follower_id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return  # not following: idempotent success, counts untouched
        raise

    adjust_count(users_table, {"id": user_id}, "follower_count", -1)
    adjust_count(users_table, {"id": follower_id}, "following_count", -1)


@router.get("/{user_id}/followers", response_model=list[User])
def get_followers(user_id: str, _viewer: str = Depends(get_current_user_id)):
    """Who follows this user. FollowingIndex flips the edge so following_id is
    the partition key, turning "who follows X" into a single Query."""
    get_public_user(user_id)
    edges = query_all_pages(
        followers_table,
        IndexName="FollowingIndex",
        KeyConditionExpression=Key("following_id").eq(user_id),
    )
    return _users_for_ids([edge["follower_id"] for edge in edges])


@router.get("/{user_id}/following", response_model=list[User])
def get_following(user_id: str, _viewer: str = Depends(get_current_user_id)):
    """Who this user follows: a Query on the base table, where follower_id is
    the partition key."""
    get_public_user(user_id)
    edges = query_all_pages(
        followers_table,
        KeyConditionExpression=Key("follower_id").eq(user_id),
    )
    return _users_for_ids([edge["following_id"] for edge in edges])
