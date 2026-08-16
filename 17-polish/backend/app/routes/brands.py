from fastapi import APIRouter, Depends, status

from app.database import brands_table
from app.dependencies.auth import get_current_user_id, require_admin
from app.models.brands import Brand, BrandCreate, BrandUpdate
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

router = APIRouter(prefix="/brands", tags=["brands"])

# The admin write side of the same domain, gated by require_admin. A second
# router in the brands file (the two-router-per-domain idiom wishes uses), so
# every brand route lives with the brand model; main.py assembles both. Its
# caller is the phase-C admin dashboard's brands screen.
admin_router = APIRouter(prefix="/admin/brands", tags=["admin", "brands"])


# Auth-gated like every data route, and the id is discarded for the same
# reason storefronts does: the browse-and-capture directory sits behind the
# sign-in gate, so the point is the gate, not who is behind it.
@router.get("", response_model=list[Brand])
def list_brands(_user_id: str = Depends(get_current_user_id)):
    """The real-store directory, ordered for display. A Scan is the right
    read, exactly as for storefronts and the life-events taxonomy: a curated
    handful of reference rows with no natural key to query by, far under the
    1 MB single-page cap so one Scan page suffices. The directory screen groups
    these by category on the client, so there is no by-category endpoint here
    (one Scan feeds the whole grouped view). Sorted by (display_order, name) so
    the client grouping stays deterministic within each category."""
    brands = brands_table.scan().get("Items", [])
    brands.sort(key=lambda b: (b.get("display_order", 0), b.get("name", "")))
    return brands


@admin_router.post("", response_model=Brand, status_code=status.HTTP_201_CREATED)
def create_brand(brand: BrandCreate, admin_id: str = Depends(require_admin)):
    """Add a brand to the real-store directory. The id is the client's slug,
    put conditionally so a collision with a seeded brand is a 409, not a
    clobber. An optional admin-uploaded logo rides the same photo discipline as
    a wishlist create: plan the pending key, write, then claim it only after the
    write commits (a failed write must never promote an object no row
    references). A brand created without one starts logoless."""
    data = brand.model_dump()
    to_claim = None
    if brand.logo_url is not None:
        # No prior object on a create, so plan against None: nothing to delete.
        data["logo_url"], to_claim, _ = plan_photo_update(brand.logo_url, None, admin_id)
    created = put_item_or_409(
        brands_table, data, f"A brand with id {brand.id!r} already exists"
    )
    if to_claim:
        claim_pending_photo(to_claim)
    return created


@admin_router.put("/{brand_id}", response_model=Brand)
def update_brand(
    brand_id: str, update: BrandUpdate, admin_id: str = Depends(require_admin)
):
    """Edit a brand's text fields and, optionally, its logo. Field-scoped and
    null-ignored: only the keys the body carries are written. A new logo rides
    the same key-based discipline as PUT /wishlists — plan the change, write,
    then claim the pending object and delete the replaced one only after the
    write commits. An edit that omits logo_url leaves the stored logo untouched
    (and a shared seed logo under catalog/ is never reaped)."""
    existing = get_item_or_404(brands_table, brand_id, "Brand not found")
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
        brands_table, {"id": brand_id}, changes, "Brand not found"
    )
    if to_claim:
        claim_pending_photo(to_claim)
    if to_delete:
        delete_photo_by_url(to_delete)
    return result


@admin_router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: str, _admin_id: str = Depends(require_admin)):
    """Remove a brand. Nothing hard-references a brand by id (the directory is
    browsed, and a captured wish copies what it needs by value), so this is an
    unguarded delete — 404 if the id isn't there. An admin-uploaded logo is the
    brand's own object, so it is swept after the row is gone (a shared seed logo
    under catalog/ is left alone — delete_photo_by_url skips it)."""
    existing = get_item_or_404(brands_table, brand_id, "Brand not found")
    delete_item_or_404(brands_table, {"id": brand_id}, "Brand not found")
    delete_photo_by_url(existing.get("logo_url"))
