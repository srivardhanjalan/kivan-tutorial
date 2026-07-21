import uuid

from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, status

from app.database import wishlists_table
from app.dependencies.auth import get_current_user_id
from app.models.wishlists import Wishlist, WishlistCreate, WishlistUpdate
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
)
from app.utils.dynamo import query_all_pages, update_item_fields
from app.utils.timestamps import utc_now_iso
from app.utils.wishlist_access import delete_wishlist_and_contents, get_owned_wishlist

router = APIRouter(prefix="/wishlists", tags=["wishlists"])


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@router.post("/", response_model=Wishlist, status_code=status.HTTP_201_CREATED)
def create_wishlist(
    wishlist: WishlistCreate, user_id: str = Depends(get_current_user_id)
):
    """Create a wishlist owned by the caller. Same photo discipline as the
    PUT routes: store the planned permanent URL, write, and only then claim
    the pending object — a failed write must never leave a promoted object
    no record references (nothing reaps the permanent keyspace).

    Accepted window: unlike the users-table writes, this create has no
    table-level deleted-account guard (a DynamoDB condition can't reach
    across to the users table). A token minted just before account deletion
    could, on an instance whose known-ids cache never saw the deletion,
    create one orphaned wishlist after the sweep ran. The exposure is one
    token lifetime (about a minute); every other collections write 404s
    post-sweep because its target is already gone. Guarding it would cost a
    users-table read on every request — the cache's whole reason to exist.
    """
    stored = to_claim = None
    if wishlist.image_url is not None:
        # No prior object on a create, so plan against None: nothing to delete
        stored, to_claim, _ = plan_photo_update(wishlist.image_url, None, user_id)
    item = {
        "id": str(uuid.uuid4()),
        "name": wishlist.name,
        "image_url": stored,
        "life_event_id": wishlist.life_event_id,
        "created_by": user_id,
        "created_at": utc_now_iso(),
    }
    wishlists_table.put_item(Item=item)
    if to_claim:
        claim_pending_photo(to_claim)
    return item


@router.get("/me", response_model=list[Wishlist])
def get_my_wishlists(user_id: str = Depends(get_current_user_id)):
    """The caller's wishlists, newest first. A Query on CreatedByIndex, never a
    Scan; the GSI has no range key, so created_at DESC is applied here (ISO
    timestamps sort lexically = chronologically)."""
    items = query_all_pages(
        wishlists_table,
        IndexName="CreatedByIndex",
        KeyConditionExpression=Key("created_by").eq(user_id),
    )
    items.sort(key=lambda w: w["created_at"], reverse=True)
    return items


@router.get("/{wishlist_id}", response_model=Wishlist)
def get_wishlist(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """A single wishlist — 404 if missing, 403 if not the caller's."""
    return get_owned_wishlist(wishlist_id, user_id)


@router.put("/{wishlist_id}", response_model=Wishlist)
def update_wishlist(
    wishlist_id: str,
    update: WishlistUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Update only the fields the body carries — exclude_unset means an omitted
    field is left untouched. The write is field-scoped and guarded (see
    update_item_fields) — never a full-item rewrite from a stale read. The
    photo swap follows the same key-based discipline as PUT /users/me: plan
    the change, write, then run the S3 claim/delete only after the write
    commits."""
    wishlist = get_owned_wishlist(wishlist_id, user_id)
    update_data = update.model_dump(exclude_unset=True)

    to_claim = to_delete = None
    changes: dict = {}
    # name and life_event_id are non-nullable: a present-but-None value is
    # ignored, never stored — a wishlist always keeps a name and a life-event
    # id. (Nothing on a wishlist clears via null this step.)
    if update_data.get("name") is not None:
        changes["name"] = update_data["name"]
    if update_data.get("life_event_id") is not None:
        changes["life_event_id"] = update_data["life_event_id"]
    # image_url: a new non-None value swaps the photo; image_url:null is ignored
    # — removing a photo isn't a step-07 flow.
    if update_data.get("image_url") is not None:
        stored, to_claim, to_delete = plan_photo_update(
            update_data["image_url"], wishlist.get("image_url"), user_id
        )
        if stored is not None:
            changes["image_url"] = stored

    if not changes:
        return wishlist
    updated = update_item_fields(
        wishlists_table, {"id": wishlist_id}, changes, "Wishlist not found"
    )

    if to_claim:
        claim_pending_photo(to_claim)
    if to_delete:
        delete_photo_by_url(to_delete)
    return updated


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wishlist(wishlist_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete the wishlist, its wishes, and every photo they uploaded."""
    wishlist = get_owned_wishlist(wishlist_id, user_id)
    delete_wishlist_and_contents(wishlist)
