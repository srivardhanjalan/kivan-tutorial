from typing import Optional

from pydantic import BaseModel


class Storefront(BaseModel):
    """A curated store in the catalog wishes can be added from. Reference data,
    exactly like the life-events taxonomy: infra/scripts/seed_storefronts.py is
    its only writer and the API only ever reads it (GET /storefronts). Pydantic
    ignores extra item fields, so step 15's admin catalog can widen the seed
    (a cover photo, an active flag) without touching this model.

    `product_count` is denormalized by the seed so the store card can show a
    count without a per-store products query. `logo_url` is a plain image URL,
    named with the app's `_url` suffix like a wish's image_url: the seed points
    it at a committed placeholder image, and the store directory renders it in
    place of a glyph. Uploading a logo from an admin dashboard (turning it into
    a signed S3 key) is a step-15 concern; the field itself carries a browsable
    URL today.
    """

    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    product_count: int = 0
    display_order: int = 0
