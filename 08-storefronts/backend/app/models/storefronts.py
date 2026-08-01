from typing import Optional

from pydantic import BaseModel


class Storefront(BaseModel):
    """A curated store in the catalog wishes can be added from. Reference data,
    exactly like the life-events taxonomy: infra/scripts/seed_storefronts.py is
    its only writer and the API only ever reads it (GET /storefronts). Pydantic
    ignores extra item fields, so step 15's admin catalog can widen the seed
    (store logos, an active flag) without touching this model.

    `product_count` is denormalized by the seed so the store card can show a
    count without a per-store products query. Store logos are a step-15 concern
    (they need the admin image uploader), so the seeded stores carry none: the
    store card shows a glyph: and there is no logo field here yet.
    """

    id: str
    name: str
    description: Optional[str] = None
    product_count: int = 0
    display_order: int = 0
