from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class ProductCreate(BaseModel):
    """POST /admin/storefronts/{storefront_id}/products body. `id` is a
    client-supplied slug (the seed writes products by a stable id), put
    conditionally so a collision is a 409. `storefront_id` is NOT here — it comes
    from the path, the same way an event host's event_id does, and the route
    checks that store exists before writing. `image_url` is optional: the step-17
    admin uploader sends a `pending/` key the route claims on save (the same
    discipline a brand logo rides), so an admin-created product starts imageless
    unless a photo is uploaded.

    `price` is a plain number here; the route stores it as a Decimal (DynamoDB
    rejects float) exactly as a wish's cost. Length caps mirror the rest of the
    app so a validated body can never blow past DynamoDB's 400 KB item limit."""

    id: str = Field(max_length=100)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    price: float = Field(ge=0)
    category: str = Field(max_length=100)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    link_url: str = Field(max_length=2048)
    display_order: int = 0


class ProductUpdate(BaseModel):
    """PUT body — send only what changes; omitted or null fields are left
    untouched. `storefront_id` is not editable: moving a product between stores
    would have to move BOTH stores' denormalized product_count too, out of scope
    here (delete it from one store and create it under the other). `id` is not
    editable either. `image_url` IS editable: a new upload's pending key swaps
    the photo (claimed on save, the replaced object swept), exactly as
    WishlistUpdate.image_url does."""

    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    price: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = Field(default=None, max_length=100)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    link_url: Optional[str] = Field(default=None, max_length=2048)
    display_order: Optional[int] = None


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
    the store screen can filter by it. The step-17 admin uploader stores real
    product photos through this same pipeline (store the S3 URL, sign on read);
    a seed placeholder stays shared under catalog/, an admin photo is the
    product's own object under product_photo/.
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
