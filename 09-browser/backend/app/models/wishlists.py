from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class WishlistCreate(BaseModel):
    """POST /wishlists/ body. life_event_id defaults to "general", the seeded
    catch-all id. The value is stored verbatim — the client picks from
    GET /life-events, and an unknown id just renders the neutral wash
    client-side, so the API doesn't re-validate it. image_url carries a
    `pending/` upload URL the route claims."""

    # Length caps: a validated body must never be able to blow past DynamoDB's
    # 400 KB item limit and 500 in the serializer instead of 422-ing here
    # (the wishes models carry the same discipline).
    name: str = Field(max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    life_event_id: str = Field(default="general", max_length=100)


class WishlistUpdate(BaseModel):
    """PUT /wishlists/{id} body — send only what changes; an omitted field is
    left untouched. Nothing here clears via null: name and life_event_id are
    non-nullable (a null is ignored), and image_url:null is ignored too
    (removing a photo isn't a step-07 flow)."""

    name: Optional[str] = Field(default=None, max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    life_event_id: Optional[str] = Field(default=None, max_length=100)


class Wishlist(BaseModel):
    """A wishlist record as stored. Single-owner this step: created_by is the
    sole owner and the only key access is checked against (co-owners join in
    step 14)."""

    id: str
    name: str
    image_url: Optional[str] = None
    life_event_id: str
    created_by: str
    created_at: str

    # The bucket is private, so the stored image_url is not directly fetchable
    # — re-sign it into a short-lived GET URL on every read. External URLs and
    # None pass through untouched.
    @field_serializer("image_url", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)
