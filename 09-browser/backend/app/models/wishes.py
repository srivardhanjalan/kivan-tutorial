from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class WishCreate(BaseModel):
    """POST /wishes/ body. image_url carries a `pending/` upload URL the route
    claims into permanent storage."""

    # min 1/max 2048 chars: a fast 422 for the common (ASCII) oversized or
    # empty id. The true byte-limit backstop is get_item_or_404 (a multibyte
    # id can pass this char bound yet exceed DynamoDB's 2048-BYTE key limit) —
    # there it 404s rather than 500ing. Two status codes, both safe.
    wishlist_id: str = Field(min_length=1, max_length=2048)
    # Length caps close the same hole as cost's bound below: without them a
    # validated body can still blow past DynamoDB's 400 KB item limit and 500
    # in the serializer instead of 422-ing here.
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    # Finite, non-negative, and bounded, enforced at validation: JSON's lax
    # parser lets Infinity/NaN through, and DynamoDB rejects both those AND
    # any magnitude past ~9.9e125 with a 500 long after the 422 should have
    # fired. 1e12 (a trillion) is far below DynamoDB's ceiling and far above
    # any price — a validated body can never blow up the serializer.
    cost: Optional[float] = Field(
        default=None, ge=0, le=1e12, allow_inf_nan=False
    )
    # The currency `cost` is quoted in, captured from the store a browser
    # scrape came from (a plain ISO code like "USD"/"INR", NOT a Decimal:
    # it is a label, not an amount). Absent on a manually-entered or catalog
    # wish, whose cost reads in the app's default symbol. 8 is the ceiling
    # for the codes the scraper emits (INR/USD/GBP/EUR/AED/SGD/AUD/CAD).
    cost_currency: Optional[str] = Field(default=None, max_length=8)
    # 2048 is the practical URL ceiling browsers/CDNs honor
    link_url: Optional[str] = Field(default=None, max_length=2048)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    # Stamped only when the wish is added from the catalog (the product's
    # storefront); a manually-typed wish leaves it null. The home/wishlist tiles
    # read it back to badge the wish with that store's logo. Same char cap as a
    # storefront id (a seeded slug, well under it); get_item_or_404 is the byte
    # backstop wherever it is looked up.
    storefront_id: Optional[str] = Field(default=None, max_length=2048)


class WishUpdate(BaseModel):
    """PUT /wishes/{id} body — send only what changes; an omitted field is left
    untouched, while an explicit null clears description, cost, or link_url.
    name is non-nullable (a null is ignored), and image_url:null is ignored too
    (removing a photo isn't a step-07 flow). A wish's cost_currency is captured
    once at creation (a browser scrape) and not edited here, so it is absent."""

    # Same caps as WishCreate, same reason — a validated body must never be
    # able to blow up the serializer.
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    cost: Optional[float] = Field(
        default=None, ge=0, le=1e12, allow_inf_nan=False
    )
    link_url: Optional[str] = Field(default=None, max_length=2048)
    image_url: Optional[str] = Field(default=None, max_length=2048)


class Wish(BaseModel):
    """A wish record as stored. `cost` goes into DynamoDB as a Decimal (it
    rejects float); Pydantic v2 coerces that Decimal back to float here on read.
    `cost_currency` is a plain string (an ISO code label), so it stores and
    reads without any Decimal coercion."""

    id: str
    wishlist_id: str
    name: str
    description: Optional[str] = None
    cost: Optional[float] = None
    cost_currency: Optional[str] = None
    link_url: Optional[str] = None
    image_url: Optional[str] = None
    # Present only on catalog-sourced wishes; drives the store-logo badge
    storefront_id: Optional[str] = None
    completed: bool = False
    created_at: str

    @field_serializer("image_url", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)
