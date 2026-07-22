import uuid
from decimal import Decimal

from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import wishes_table
from app.dependencies.auth import get_current_user_id
from app.models.wishes import Wish, WishCreate, WishUpdate
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
)
from app.utils.dynamo import get_item_or_404, query_all_pages, update_item_fields
from app.utils.timestamps import utc_now_iso
from app.utils.wishlist_access import get_owned_wishlist

router = APIRouter(prefix="/wishes", tags=["wishes"])

# The wishlist-scoped listing nests under /wishlists, so it lives on its own
# router with that prefix; main.py includes both.
wishlist_wishes_router = APIRouter(prefix="/wishlists", tags=["wishes"])


def _get_owned_wish(wish_id: str, user_id: str) -> dict:
    """Fetch a wish and enforce access through its wishlist's owner: 404 if the
    wish is missing, then the wishlist's own 404/403 rules."""
    wish = get_item_or_404(wishes_table, wish_id, "Wish not found")
    get_owned_wishlist(wish["wishlist_id"], user_id)
    return wish


# Sync handlers on purpose: FastAPI threadpools them, keeping DynamoDB's
# blocking I/O off the event loop.
@router.post("/", response_model=Wish, status_code=status.HTTP_201_CREATED)
def create_wish(wish: WishCreate, user_id: str = Depends(get_current_user_id)):
    """Add a wish to one of the caller's wishlists. Same photo discipline as
    the PUT routes: store the planned permanent URL, write, then claim — a
    failed write must never leave a promoted object no record references."""
    get_owned_wishlist(wish.wishlist_id, user_id)  # 404/403 before any write
    stored = to_claim = None
    if wish.image_url is not None:
        # No prior object on a create, so plan against None: nothing to delete
        stored, to_claim, _ = plan_photo_update(wish.image_url, None, user_id)
    item = {
        "id": str(uuid.uuid4()),
        "wishlist_id": wish.wishlist_id,
        "name": wish.name,
        "description": wish.description,
        # DynamoDB rejects float — store Decimal; the response model coerces back
        "cost": Decimal(str(wish.cost)) if wish.cost is not None else None,
        "link_url": wish.link_url,
        "image_url": stored,
        "completed": False,
        "created_at": utc_now_iso(),
    }
    wishes_table.put_item(Item=item)
    if to_claim:
        claim_pending_photo(to_claim)
    return item


@router.get("/{wish_id}", response_model=Wish)
def get_wish(wish_id: str, user_id: str = Depends(get_current_user_id)):
    """A single wish — access checked through its wishlist's owner."""
    return _get_owned_wish(wish_id, user_id)


@router.put("/{wish_id}", response_model=Wish)
def update_wish(
    wish_id: str, update: WishUpdate, user_id: str = Depends(get_current_user_id)
):
    """Update only the fields the body carries — exclude_unset means an omitted
    field is left untouched, while an explicit null clears a nullable one. The
    write is field-scoped (update_item_fields), so an unrelated field a
    concurrent request changed — the complete toggle — is never rewritten from
    this handler's stale read. Photo swap uses the same key-based
    plan-then-commit discipline as the other PUT routes."""
    wish = _get_owned_wish(wish_id, user_id)
    update_data = update.model_dump(exclude_unset=True)

    to_claim = to_delete = None
    changes: dict = {}
    # name is non-nullable — a present-but-None value is ignored, never stored.
    if update_data.get("name") is not None:
        changes["name"] = update_data["name"]
    # description and link_url are nullable: present sets-or-clears, absent
    # leaves the stored value alone.
    if "description" in update_data:
        changes["description"] = update_data["description"]
    if "link_url" in update_data:
        changes["link_url"] = update_data["link_url"]
    # cost: a non-None value is stored as Decimal (DynamoDB rejects float); an
    # explicit cost:null clears it.
    if "cost" in update_data:
        cost = update_data["cost"]
        changes["cost"] = Decimal(str(cost)) if cost is not None else None
    # image_url: swap only on a non-None value; image_url:null is ignored —
    # removing a photo isn't a step-07 flow.
    if update_data.get("image_url") is not None:
        stored, to_claim, to_delete = plan_photo_update(
            update_data["image_url"], wish.get("image_url"), user_id
        )
        if stored is not None:
            changes["image_url"] = stored

    if not changes:
        return wish
    updated = update_item_fields(
        wishes_table, {"id": wish_id}, changes, "Wish not found"
    )

    if to_claim:
        claim_pending_photo(to_claim)
    if to_delete:
        delete_photo_by_url(to_delete)
    return updated


@router.delete("/{wish_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wish(wish_id: str, user_id: str = Depends(get_current_user_id)):
    """Remove a wish and its uploaded photo — photo first, row after, so an
    interruption leaves a row a retried delete can still find (the cascade's
    ordering discipline and its accepted S3-failure gap; see
    delete_wishlist_and_contents)."""
    wish = _get_owned_wish(wish_id, user_id)
    delete_photo_by_url(wish.get("image_url"))
    wishes_table.delete_item(Key={"id": wish_id})


@router.post("/{wish_id}/complete", response_model=Wish)
def complete_wish(wish_id: str, user_id: str = Depends(get_current_user_id)):
    """Mark a wish completed."""
    return _set_completed(wish_id, user_id, True)


@router.post("/{wish_id}/uncomplete", response_model=Wish)
def uncomplete_wish(wish_id: str, user_id: str = Depends(get_current_user_id)):
    """Mark a wish not completed."""
    return _set_completed(wish_id, user_id, False)


def _set_completed(wish_id: str, user_id: str, completed: bool) -> dict:
    """Flip just the `completed` flag once access is confirmed — the same
    guarded field-scoped write as PUT (see update_item_fields)."""
    _get_owned_wish(wish_id, user_id)  # 404/403 guard
    return update_item_fields(
        wishes_table, {"id": wish_id}, {"completed": completed}, "Wish not found"
    )


@wishlist_wishes_router.get("/{wishlist_id}/wishes", response_model=list[Wish])
def get_wishlist_wishes(
    wishlist_id: str, user_id: str = Depends(get_current_user_id)
):
    """A wishlist's wishes in insertion order (created_at ASC). Access is the
    wishlist's own 404/403 rule; the GSI has no range key, so the sort is here."""
    get_owned_wishlist(wishlist_id, user_id)
    wishes = query_all_pages(
        wishes_table,
        IndexName="WishlistIdIndex",
        KeyConditionExpression=Key("wishlist_id").eq(wishlist_id),
    )
    wishes.sort(key=lambda w: w["created_at"])
    return wishes
