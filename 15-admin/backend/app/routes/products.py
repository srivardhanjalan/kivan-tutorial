from decimal import Decimal

from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import products_table, storefronts_table
from app.dependencies.auth import get_current_user_id, require_admin
from app.models.products import Product, ProductCreate, ProductUpdate
from app.utils.dynamo import (
    adjust_count,
    delete_item_or_404,
    get_item_or_404,
    put_item_or_409,
    query_all_pages,
    update_item_fields,
)

# Products are always browsed inside their storefront, so the one listing route
# nests under /storefronts. Products are their own domain (own model, own
# table), so the route lives in its own file: main.py includes it alongside
# the storefronts router, the same two-router pattern wishes uses.
router = APIRouter(prefix="/storefronts", tags=["products"])

# The admin write side, nested under a store the same way the public listing is
# (a product belongs to exactly one store, like an event host to its event), so
# storefront_id comes from the path. Gated by require_admin; its caller is the
# phase-C admin dashboard's products screen.
admin_router = APIRouter(prefix="/admin/storefronts", tags=["admin", "products"])


def _product_under_store(product_id: str, storefront_id: str) -> dict:
    """Fetch a product and confirm it belongs to the store in the path — 404 on
    either miss. The path names both, so a product id under the wrong store is
    not-found, never an edit or delete of a product filed under another store."""
    product = get_item_or_404(products_table, product_id, "Product not found")
    if product.get("storefront_id") != storefront_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return product


@router.get("/{storefront_id}/products", response_model=list[Product])
def list_storefront_products(
    storefront_id: str, _user_id: str = Depends(get_current_user_id)
):
    """A storefront's products, ordered for display. A Query on StorefrontIdIndex
    (never a Scan of the whole catalog), paged to the end via query_all_pages;
    the GSI is hash-only, so DynamoDB returns items in no useful order and the
    display_order sort happens here: the same shape as the wishes listing off
    WishlistIdIndex."""
    products = query_all_pages(
        products_table,
        IndexName="StorefrontIdIndex",
        KeyConditionExpression=Key("storefront_id").eq(storefront_id),
    )
    products.sort(key=lambda p: p.get("display_order", 0))
    return products


@admin_router.post(
    "/{storefront_id}/products",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    storefront_id: str, product: ProductCreate, _admin_id: str = Depends(require_admin)
):
    """Add a product to a store. The store must exist (404 otherwise) — a
    product filed under a phantom store would never list and would nudge a
    phantom count. The id is the client's slug, put conditionally (409 on
    collision). price stores as a Decimal (DynamoDB rejects float). On success
    the store's denormalized product_count moves up by one."""
    get_item_or_404(storefronts_table, storefront_id, "Storefront not found")
    item = {
        **product.model_dump(),
        "storefront_id": storefront_id,
        "price": Decimal(str(product.price)),
    }
    created = put_item_or_409(
        products_table, item, f"A product with id {product.id!r} already exists"
    )
    # Only after the row is safely written (never on a 409) does the tally move.
    adjust_count(storefronts_table, {"id": storefront_id}, "product_count", 1)
    return created


@admin_router.put("/{storefront_id}/products/{product_id}", response_model=Product)
def update_product(
    storefront_id: str,
    product_id: str,
    update: ProductUpdate,
    _admin_id: str = Depends(require_admin),
):
    """Edit a product under its store. Field-scoped and null-ignored; price
    stores as a Decimal. storefront_id is not editable, so the tally never moves
    on an edit."""
    existing = _product_under_store(product_id, storefront_id)
    update_data = update.model_dump(exclude_unset=True)
    changes = {
        k: v
        for k, v in update_data.items()
        if v is not None and k != "price"
    }
    if update_data.get("price") is not None:
        changes["price"] = Decimal(str(update_data["price"]))
    if not changes:
        return existing
    return update_item_fields(
        products_table, {"id": product_id}, changes, "Product not found"
    )


@admin_router.delete(
    "/{storefront_id}/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product(
    storefront_id: str, product_id: str, _admin_id: str = Depends(require_admin)
):
    """Remove a product from its store and move the store's product_count down
    by one. Nothing hard-references a product (a captured wish copies its photo,
    price and link by value at add-time), so this is otherwise unguarded — 404
    if the product isn't under this store. The count decrement is the mirror of
    create's increment, so the store's tally stays honest."""
    _product_under_store(product_id, storefront_id)
    delete_item_or_404(products_table, {"id": product_id}, "Product not found")
    adjust_count(storefronts_table, {"id": storefront_id}, "product_count", -1)
