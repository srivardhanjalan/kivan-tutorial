from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class BrandCreate(BaseModel):
    """POST /admin/brands body. `id` is a client-supplied slug, not a minted
    uuid: brands are reference data the seed writes by hand-picked id (like the
    life-events taxonomy and the storefronts catalog), so the admin dashboard
    supplies the same kind of stable, human-meaningful id. The route puts it
    conditionally, so re-using a seeded id is a 409, never a silent clobber.

    `logo_url` is optional: the admin dashboard's logo uploader (step 17) sends
    the S3 key of a `pending/` upload, and the route claims it on save the same
    way a wishlist claims its image_url. A brand created without one starts
    logoless (a seeded brand's logo is a shared catalog/ object the seed owns —
    an edit that omits logo_url never touches it). The client never sends a
    signed read URL back; it sends the pending key, and reads re-sign.

    Length caps mirror the rest of the app: a validated body can never blow past
    DynamoDB's 400 KB item limit and 500 in the serializer instead of 422-ing
    here."""

    id: str = Field(max_length=100)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    website_url: str = Field(max_length=2048)
    category: str = Field(max_length=100)
    country: str = Field(max_length=100)
    logo_url: Optional[str] = Field(default=None, max_length=2048)
    display_order: int = 0


class BrandUpdate(BaseModel):
    """PUT /admin/brands/{id} body — send only what changes; an omitted field is
    left untouched, and a present-but-None value is ignored (nothing clears via
    null, the same discipline WishlistUpdate carries). `id` is immutable (it is
    the key). `logo_url` is editable: a new upload's pending key swaps the logo
    (claimed on save, the replaced object swept — a shared seed logo is never
    reaped), exactly as WishlistUpdate.image_url does."""

    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    website_url: Optional[str] = Field(default=None, max_length=2048)
    category: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    logo_url: Optional[str] = Field(default=None, max_length=2048)
    display_order: Optional[int] = None


class Brand(BaseModel):
    """A real store in the browse-and-capture directory. Reference data,
    exactly like the storefronts catalog and the life-events taxonomy:
    infra/scripts/seed_brands.py is its only writer and the API only ever
    reads it (GET /brands). Where the storefronts catalog is a made-up shop
    of placeholder products, these are REAL brands with real websites: the
    in-app browser opens website_url, you navigate to a product page, and
    Firecrawl scrapes that page into a wish.

    `logo_url` stores the brand logo's URL in the private photos bucket, named
    with the app's `_url` suffix and signed on read exactly like a storefront's
    logo: the seed uploads each committed placeholder logo under the catalog/
    keyspace and stores that object's bucket URL, and the serializer below
    re-signs it on read (get_signed_url_for_s3) so the API returns a short-lived
    presigned URL and the bucket stays fully private. The step-17 admin uploader
    replaces a placeholder with an admin-uploaded logo through this same pipeline
    (store the S3 URL, sign on read); a seed placeholder stays shared under
    catalog/, an admin logo is the brand's own object under brand_logo/.

    The in-app browser opens `website_url`; `country` is a display hint for the
    row and signals the currency a scrape from that store is likely to quote in.
    Pydantic ignores extra item fields, so step 15's admin catalog can widen the
    seed (an active flag) without touching this model.
    """

    id: str
    name: str
    description: Optional[str] = None
    website_url: str
    category: str
    country: str
    logo_url: Optional[str] = None
    display_order: int = 0

    @field_serializer("logo_url", mode="plain")
    def _sign_logo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)
