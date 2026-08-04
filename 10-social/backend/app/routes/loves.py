from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, status

from app.database import wishlist_loves_table, wishlists_table
from app.dependencies.auth import get_current_user_id
from app.models.loves import LoveStatus
from app.models.wishlists import Wishlist
from app.utils.dynamo import adjust_count, batch_get_items, query_all_pages
from app.utils.user_access import get_public_user
from app.utils.wishlist_access import get_wishlist_or_404

# Loves span two nouns: the action is wishlist-scoped (POST /wishlists/{id}/love)
# and the collection is user-scoped (a user's loved wishlists). One concern, two
# prefixes: the same split-router shape wishes.py uses; main.py includes both.
love_router = APIRouter(prefix="/wishlists", tags=["loves"])
loved_router = APIRouter(prefix="/users", tags=["loves"])


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@love_router.post("/{wishlist_id}/love", status_code=status.HTTP_204_NO_CONTENT)
def love_wishlist(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """Love a wishlist. Idempotent via a conditional put, exactly the follow
    edge's discipline, so the denormalized love_count moves only on the first
    love and a repeat is a harmless 204."""
    get_wishlist_or_404(wishlist_id)  # 404 a love aimed at nothing

    try:
        wishlist_loves_table.put_item(
            Item={"user_id": user_id, "wishlist_id": wishlist_id},
            ConditionExpression="attribute_not_exists(user_id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return  # already loved: idempotent, count untouched
        raise

    adjust_count(wishlists_table, {"id": wishlist_id}, "love_count", 1)


@love_router.delete("/{wishlist_id}/love", status_code=status.HTTP_204_NO_CONTENT)
def unlove_wishlist(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """Unlove a wishlist. Conditional delete mirrors love, so the count drops
    exactly once and a repeat unlove is a no-op."""
    try:
        wishlist_loves_table.delete_item(
            Key={"user_id": user_id, "wishlist_id": wishlist_id},
            ConditionExpression="attribute_exists(user_id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return  # not loved: idempotent, count untouched
        raise

    adjust_count(wishlists_table, {"id": wishlist_id}, "love_count", -1)


@love_router.get("/{wishlist_id}/love/status", response_model=LoveStatus)
def get_love_status(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """Whether the current user loves this wishlist: the per-viewer bit the
    detail screen needs, a single GetItem on the composite (user, wishlist) key."""
    response = wishlist_loves_table.get_item(
        Key={"user_id": user_id, "wishlist_id": wishlist_id}
    )
    return LoveStatus(is_loved="Item" in response)


@loved_router.get("/{user_id}/loved-wishlists", response_model=list[Wishlist])
def get_loved_wishlists(user_id: str, _viewer: str = Depends(get_current_user_id)):
    """The wishlists a user has loved. A Query on the base loves table (user_id
    partitions it), then one BatchGetItem to the wishlists. A loved wishlist
    later deleted simply drops out: the love edge outlived it, and this join
    skips the missing record rather than 404-ing the whole list."""
    get_public_user(user_id)
    edges = query_all_pages(
        wishlist_loves_table,
        KeyConditionExpression=Key("user_id").eq(user_id),
    )
    wishlist_ids = list(dict.fromkeys(edge["wishlist_id"] for edge in edges))
    if not wishlist_ids:
        return []
    by_id = {
        item["id"]: item
        for item in batch_get_items(wishlists_table, [{"id": wid} for wid in wishlist_ids])
    }
    return [Wishlist(**by_id[wid]) for wid in wishlist_ids if wid in by_id]
