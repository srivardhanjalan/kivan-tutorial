"""
Shared wishlist ownership: the single-owner access check both the wishlists
and wishes routes funnel through, and the cascade-delete both DELETE
/wishlists/{id} and account deletion reuse.
"""
from boto3.dynamodb.conditions import Key
from fastapi import HTTPException, status

from app.database import wishes_table, wishlists_table
from app.utils.dynamo import get_item_or_404, query_all_pages
from app.utils.s3_helpers import delete_photo_by_url


def get_owned_wishlist(wishlist_id: str, user_id: str) -> dict:
    """Fetch a wishlist and enforce single-owner access: 404 if it doesn't
    exist, 403 if the caller didn't create it. The same rule everywhere — a
    wish's access is its wishlist's access."""
    wishlist = get_item_or_404(wishlists_table, wishlist_id, "Wishlist not found")
    if wishlist["created_by"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this wishlist",
        )
    return wishlist


def delete_wishlist_and_contents(wishlist: dict) -> None:
    """Delete a wishlist, all its wishes, and every uploaded photo they
    referenced. Wishes come off WishlistIdIndex; delete_photo_by_url ignores
    external URLs. Two callers: DELETE /wishlists/{id} and account deletion's
    wishlist sweep — the access check is the caller's job, this only tears
    down.

    Photos go FIRST, rows after, so an INTERRUPTED cascade (crash, instance
    recycle) leaves only states a retry can finish: a surviving row still
    points at its photo, and re-running the delete finds and re-deletes both.
    The reverse order (rows first) would strand every already-dropped row's
    photo forever. One accepted gap: delete_photo_by_url logs-and-swallows a
    per-object S3 failure rather than aborting a teardown the user asked for
    — that single object is orphaned, bounded and logged, not silent."""
    wishlist_id = wishlist["id"]
    wishes = query_all_pages(
        wishes_table,
        IndexName="WishlistIdIndex",
        KeyConditionExpression=Key("wishlist_id").eq(wishlist_id),
    )

    delete_photo_by_url(wishlist.get("image_url"))
    for wish in wishes:
        delete_photo_by_url(wish.get("image_url"))

    with wishes_table.batch_writer() as batch:
        for wish in wishes:
            batch.delete_item(Key={"id": wish["id"]})

    wishlists_table.delete_item(Key={"id": wishlist_id})
