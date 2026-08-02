from typing import Optional

from pydantic import BaseModel


class Brand(BaseModel):
    """A real store in the browse-and-capture directory. Reference data,
    exactly like the storefronts catalog and the life-events taxonomy:
    infra/scripts/seed_brands.py is its only writer and the API only ever
    reads it (GET /brands). Where the storefronts catalog is a made-up shop
    of placeholder products, these are REAL brands with real websites: the
    in-app browser opens website_url, you navigate to a product page, and
    Firecrawl scrapes that page into a wish.

    Pydantic ignores extra item fields, so step 15's admin catalog can widen
    the seed (a store logo, an active flag) without touching this model. Brand
    logos are a step-15 concern (they need the admin image uploader), so the
    seeded brands carry none: the directory row shows a glyph, and there is no
    logo field here yet. The in-app browser opens `website_url`; `country` is a
    display hint for the row and signals the currency a scrape from that store
    is likely to quote in.
    """

    id: str
    name: str
    description: Optional[str] = None
    website_url: str
    category: str
    country: str
    display_order: int = 0
