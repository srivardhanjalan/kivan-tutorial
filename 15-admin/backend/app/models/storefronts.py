from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class StorefrontCreate(BaseModel):
    """POST /admin/storefronts body. `id` is a client-supplied slug (the seed
    writes stores by a stable id), put conditionally so a collision with a
    seeded store is a 409, not a clobber. `logo_url` is omitted for the same
    reason as a brand's (a seed-owned catalog object; no logo-upload UI in the
    plain dashboard yet), and `product_count` is omitted because it is
    denormalized: a new store has zero products, and the count is maintained by
    the product create/delete routes, never hand-set here.

    Length caps mirror the rest of the app so a validated body can never blow
    past DynamoDB's 400 KB item limit."""

    id: str = Field(max_length=100)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    display_order: int = 0


class StorefrontUpdate(BaseModel):
    """PUT /admin/storefronts/{id} body — send only what changes; omitted or
    null fields are left untouched. `id` and the seed-owned `logo_url` are not
    editable, and `product_count` is not either: it is a denormalized tally the
    product routes keep, so a hand-edit here would let it drift from the
    products actually under the store."""

    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    display_order: Optional[int] = None


class Storefront(BaseModel):
    """A curated store in the catalog wishes can be added from. Reference data,
    exactly like the life-events taxonomy: infra/scripts/seed_storefronts.py is
    its only writer and the API only ever reads it (GET /storefronts). Pydantic
    ignores extra item fields, so step 15's admin catalog can widen the seed
    (a cover photo, an active flag) without touching this model.

    `product_count` is denormalized by the seed so the store card can show a
    count without a per-store products query. `logo_url` stores the store logo's
    URL in the private photos bucket, named with the app's `_url` suffix like a
    wish's image_url: the seed uploads each committed placeholder logo under the
    catalog/ keyspace and stores that object's bucket URL, and the serializer
    below re-signs it on read (get_signed_url_for_s3) so the API returns a
    short-lived presigned URL and the bucket stays fully private. Replacing a
    placeholder with an admin-uploaded logo is a step-15 concern; the pipeline it
    rides (store the S3 URL, sign on read) is already the real one.
    """

    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    product_count: int = 0
    display_order: int = 0

    @field_serializer("logo_url", mode="plain")
    def _sign_logo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)
