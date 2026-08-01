from typing import Optional

from pydantic import BaseModel


class Product(BaseModel):
    """One item in a curated storefront, addable to a wishlist as a wish.
    Reference data seeded by infra/scripts/seed_storefronts.py and only ever
    read (GET /storefronts/{id}/products); Pydantic ignores extra item fields so
    the seed can widen (a product image, a category) without touching this model.

    `price` is stored in DynamoDB as a Decimal (it rejects float) and coerced
    back to float here on read, exactly like a wish's `cost`: a product added
    to a wishlist carries its price straight onto that wish's cost, in the app's
    one currency with no conversion (per-currency pricing is a step-09 concern).
    Product images need the admin uploader (step 15), so the seeded rows carry
    none: the product tile and detail hero show a placeholder glyph, the same
    as a wish with no photo: and there is no image field here yet.
    """

    id: str
    storefront_id: str
    name: str
    description: Optional[str] = None
    price: float
    # link_url, not link: the app names every external/stored URL with the _url
    # suffix (a wish's link_url, a user's image_url), so a product carries its
    # store URL straight onto a wish's link_url, field for field
    link_url: str
    display_order: int = 0
