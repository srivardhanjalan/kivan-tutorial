from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import products_table, storefronts_table
from app.dependencies.auth import get_current_user_id, require_admin
from app.models.storefronts import Storefront, StorefrontCreate, StorefrontUpdate
from app.utils.dynamo import (
    delete_item_or_404,
    get_item_or_404,
    put_item_or_409,
    update_item_fields,
)
from app.utils.s3_helpers import (
    claim_pending_photo,
    delete_photo_by_url,
    plan_photo_update,
)

router = APIRouter(prefix="/storefronts", tags=["storefronts"])

# The admin write side of the catalog, gated by require_admin (the two-router-
# per-domain idiom). Its caller is the phase-C admin dashboard's storefronts
# screen. Product CRUD hangs off /admin/storefronts/{id}/products in the
# products file, the same nesting the public product listing uses.
admin_router = APIRouter(prefix="/admin/storefronts", tags=["admin", "storefronts"])


def _has_products(storefront_id: str) -> bool:
    """True if any product belongs to this store. A Query on StorefrontIdIndex
    (never a Scan), Limit=1 because existence is all the delete guard needs — a
    Query applies Limit after the key match, so one row is a definitive yes."""
    response = products_table.query(
        IndexName="StorefrontIdIndex",
        KeyConditionExpression=Key("storefront_id").eq(storefront_id),
        Select="COUNT",
        Limit=1,
    )
    return response.get("Count", 0) > 0


# Auth-gated like every data route (only / and /health stay open: App Runner's
# health checks can't carry a token). The Wish Store tab sits behind the sign-in
# gate, so `_user_id` is discarded: the point here is the gate itself, not who
# is behind it (the same shape as GET /life-events).
@router.get("", response_model=list[Storefront])
def list_storefronts(_user_id: str = Depends(get_current_user_id)):
    """The curated catalog of stores, ordered for display. A Scan is the right
    read: a handful of curated reference rows with no natural key to query by,
    exactly like the life-events taxonomy (and, like it, far under the 1 MB
    single-page cap, so one Scan page suffices)."""
    storefronts = storefronts_table.scan().get("Items", [])
    storefronts.sort(key=lambda s: s.get("display_order", 0))
    return storefronts


@admin_router.post("", response_model=Storefront, status_code=status.HTTP_201_CREATED)
def create_storefront(
    storefront: StorefrontCreate, admin_id: str = Depends(require_admin)
):
    """Add a store to the catalog. The id is the client's slug, put
    conditionally so a collision with a seeded store is a 409. product_count
    starts at zero — the store has no products until they are created under it,
    and the product routes move the tally from there. An optional admin-uploaded
    logo rides the wishlist-create photo discipline: plan, write, then claim only
    after the write commits."""
    item = {**storefront.model_dump(), "product_count": 0}
    to_claim = None
    if storefront.logo_url is not None:
        item["logo_url"], to_claim, _ = plan_photo_update(
            storefront.logo_url, None, admin_id
        )
    created = put_item_or_409(
        storefronts_table, item, f"A storefront with id {storefront.id!r} already exists"
    )
    if to_claim:
        claim_pending_photo(to_claim)
    return created


@admin_router.put("/{storefront_id}", response_model=Storefront)
def update_storefront(
    storefront_id: str,
    update: StorefrontUpdate,
    admin_id: str = Depends(require_admin),
):
    """Edit a store's text fields and, optionally, its logo. Field-scoped and
    null-ignored: only the keys the body carries are written, so an edit never
    touches the denormalized product_count. A new logo rides the same key-based
    discipline as PUT /wishlists — plan, write, then claim the pending object and
    delete the replaced one only after the write commits."""
    existing = get_item_or_404(storefronts_table, storefront_id, "Storefront not found")
    update_data = update.model_dump(exclude_unset=True)

    to_claim = to_delete = None
    changes = {
        k: v for k, v in update_data.items() if v is not None and k != "logo_url"
    }
    if update_data.get("logo_url") is not None:
        stored, to_claim, to_delete = plan_photo_update(
            update_data["logo_url"], existing.get("logo_url"), admin_id
        )
        if stored is not None:
            changes["logo_url"] = stored
    if not changes:
        return existing
    result = update_item_fields(
        storefronts_table, {"id": storefront_id}, changes, "Storefront not found"
    )
    if to_claim:
        claim_pending_photo(to_claim)
    if to_delete:
        delete_photo_by_url(to_delete)
    return result


@admin_router.delete("/{storefront_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_storefront(storefront_id: str, _admin_id: str = Depends(require_admin)):
    """Remove a store — but only once it is empty. A product belongs to exactly
    one store and carries its storefront_id, so deleting a store with products
    would orphan them (the products listing queries by that id). That is a
    deliberate 409: clear the store's products first. 404 if the id isn't there.
    The guard reads the actual products (via StorefrontIdIndex), not the
    denormalized product_count, so a drifted count can never fool it. It is not
    airtight against a very recently created product: StorefrontIdIndex is a GSI
    (eventually consistent, no ConsistentRead), so a product not yet propagated
    can be missed here — the same window the public products listing, which
    reads the same index, already lives with. An admin-only rare path, and the
    orphan would not list either, so this is an accepted bound, not a guarantee.
    An admin-uploaded logo is the store's own object, so it is swept after the
    row is gone (a shared seed logo under catalog/ is left alone)."""
    if _has_products(storefront_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This storefront still has products; delete them first",
        )
    existing = get_item_or_404(storefronts_table, storefront_id, "Storefront not found")
    delete_item_or_404(storefronts_table, {"id": storefront_id}, "Storefront not found")
    delete_photo_by_url(existing.get("logo_url"))
