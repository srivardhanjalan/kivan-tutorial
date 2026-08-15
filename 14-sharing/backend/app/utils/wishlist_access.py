"""
Shared wishlist access: the ONE gate both the wishlists and wishes routes
funnel through (view or edit), the owner-or-co-owner membership test it rests
on, and the cascade-delete both DELETE /wishlists/{id} and account deletion
reuse.
"""
from boto3.dynamodb.conditions import Key
from fastapi import HTTPException, status

from app.database import wishes_table, wishlist_owners_table, wishlists_table
from app.utils.dynamo import get_item_or_404, query_all_pages
from app.utils.s3_helpers import delete_photo_by_url


def get_wishlist_or_404(wishlist_id: str) -> dict:
    """Fetch a wishlist by id, no access check: 404 if missing. The bare
    existence probe check_wishlist_access builds on, and the one a love (which
    any viewer may aim at any wishlist) needs on its own."""
    return get_item_or_404(wishlists_table, wishlist_id, "Wishlist not found")


def is_wishlist_owner(wishlist_id: str, user_id: str) -> bool:
    """Is this user an owner of the wishlist? A direct GetItem on the
    wishlist-owners edge keyed (wishlist_id, user_id). The creator and every
    co-owner has a row, so this one test is the whole write credential:
    owner-or-co-owner, no distinction between them (mirrors is_event_host)."""
    response = wishlist_owners_table.get_item(
        Key={"wishlist_id": wishlist_id, "user_id": user_id}
    )
    return "Item" in response


def wishlist_is_public(wishlist: dict) -> bool:
    """Is this wishlist publicly viewable? A stored record with no privacy_type
    (created before the field existed) reads as public, the visibility every
    wishlist had before privacy landed. The one place the "public" spelling
    lives, so the read filters and the gate can't drift apart."""
    return wishlist.get("privacy_type", "public") == "public"


def can_view_wishlist(wishlist: dict, user_id: str) -> bool:
    """Whether this user may VIEW a wishlist: it's public, or they own/co-own it.
    The boolean form of check_wishlist_access's view branch, for the read
    surfaces that filter a LIST (a profile grid, the loved shelf, an event's
    linked wishlists) rather than gate a single fetch. Same rule, one place, no
    per-item raise; the owner probe only runs when the wishlist isn't public."""
    return wishlist_is_public(wishlist) or is_wishlist_owner(wishlist["id"], user_id)


def check_wishlist_access(
    wishlist_id: str, user_id: str, require_edit: bool = False
) -> dict:
    """The single wishlist gate: 404 if it doesn't exist, then either view or
    edit access. An owner or co-owner always passes. require_edit=True and a
    non-owner is a 403. This is the write credential every wishlist edit,
    delete, and wish mutation funnels through, so a wish's write access is just
    its wishlist's ownership.

    The view path (require_edit=False) enforces privacy: a public wishlist is
    readable by any signed-in user (a friend's collection off their profile, one
    you're about to love), a private one only by its owners and co-owners: a
    non-owner viewer of a private wishlist is a 403, matching the source. Every
    read funnels through this one gate, so privacy is decided in one place, not
    re-checked at each call site."""
    wishlist = get_wishlist_or_404(wishlist_id)
    if is_wishlist_owner(wishlist_id, user_id):
        return wishlist
    if require_edit or not wishlist_is_public(wishlist):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this wishlist",
        )
    return wishlist


def delete_wishlist_and_contents(wishlist: dict) -> None:
    """Delete a wishlist, all its wishes, every uploaded photo they referenced,
    and every owner edge. Wishes come off WishlistIdIndex, owner rows off the
    base table; delete_photo_by_url ignores external URLs. Two callers: DELETE
    /wishlists/{id} and account deletion's wishlist sweep; the access check is
    the caller's job, this only tears down.

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
    owners = query_all_pages(
        wishlist_owners_table,
        KeyConditionExpression=Key("wishlist_id").eq(wishlist_id),
    )

    delete_photo_by_url(wishlist.get("image_url"))
    for wish in wishes:
        delete_photo_by_url(wish.get("image_url"))

    with wishes_table.batch_writer() as batch:
        for wish in wishes:
            batch.delete_item(Key={"id": wish["id"]})
    with wishlist_owners_table.batch_writer() as batch:
        for owner in owners:
            batch.delete_item(
                Key={"wishlist_id": wishlist_id, "user_id": owner["user_id"]}
            )

    wishlists_table.delete_item(Key={"id": wishlist_id})
