from typing import Optional

from pydantic import BaseModel, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class Product(BaseModel):
    """One item in a curated storefront, addable to a wishlist as a wish.
    Reference data seeded by infra/scripts/seed_storefronts.py and only ever
    read (GET /storefronts/{id}/products); Pydantic ignores extra item fields so
    the seed can widen (more image slots, a stock flag) without touching this
    model.

    `price` is stored in DynamoDB as a Decimal (it rejects float) and coerced
    back to float here on read, exactly like a wish's `cost`: a product added
    to a wishlist carries its price straight onto that wish's cost, in the app's
    one currency with no conversion (per-currency pricing is a later concern).

    `image_url` stores the product photo's URL in the private photos bucket,
    named to match a wish's image_url field for field: the seed uploads each
    committed placeholder photo under the catalog/ keyspace and stores that
    object's bucket URL, the product tile and detail hero render it, and adding
    the product to a wishlist carries that same catalog URL straight onto the new
    wish's image_url (where the wish serializer re-signs it identically). The
    serializer below re-signs it on read (get_signed_url_for_s3) so the API
    returns a short-lived presigned URL. `category` groups a store's products so
    the store screen can filter by it. Uploading real product photos from an
    admin dashboard is a step-15 concern; the pipeline (store the S3 URL, sign on
    read) is already the real one.
    """

    id: str
    storefront_id: str
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[str] = None
    # link_url, not link: the app names every external/stored URL with the _url
    # suffix (a wish's link_url, a user's image_url), so a product carries its
    # store URL straight onto a wish's link_url, field for field
    link_url: str
    display_order: int = 0

    @field_serializer("image_url", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)
