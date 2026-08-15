from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends

from app.database import products_table
from app.dependencies.auth import get_current_user_id
from app.models.products import Product
from app.utils.dynamo import query_all_pages

# Products are always browsed inside their storefront, so the one listing route
# nests under /storefronts. Products are their own domain (own model, own
# table), so the route lives in its own file: main.py includes it alongside
# the storefronts router, the same two-router pattern wishes uses.
router = APIRouter(prefix="/storefronts", tags=["products"])


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
