from typing import Optional

from pydantic import BaseModel, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


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
    presigned URL and the bucket stays fully private. Replacing a placeholder
    with an admin-uploaded logo is a step-15 concern; the pipeline it rides
    (store the S3 URL, sign on read) is already the real one.

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
