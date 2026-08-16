from typing import Literal, Optional

from pydantic import BaseModel, Field, field_serializer

# The whole privacy vocabulary: a wishlist is public (visible to anyone) or
# private (only its owners and co-owners). The source stored a free-form str
# documented as "public"/"private"/"shared", but no code path ever honored
# "shared": every check was `== "public"`, so "shared" collapsed to private.
# Porting a third value nothing distinguishes would be a comment that lies, so
# this is a two-value Literal: an unknown value is a 422 at the boundary, not a
# silently-private wishlist. (Tutorial readers diffing against the source: the
# missing "shared" is deliberate, not an omission.)
PrivacyType = Literal["public", "private"]

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
    # Defaults public: a new wishlist is discoverable and viewable off a profile
    # unless the creator chooses private. (See PrivacyType for why there is no
    # "shared".)
    privacy_type: PrivacyType = "public"
    # Co-owners to seed at creation (step 14). The creator is always the first
    # owner; these are additional owners, validated against the users table (an
    # unknown id is skipped, not a 422) and written as owner rows alongside the
    # wishlist. Absent or empty leaves the wishlist single-owner.
    owner_ids: Optional[list[str]] = None


class WishlistUpdate(BaseModel):
    """PUT /wishlists/{id} body — send only what changes; an omitted field is
    left untouched. Nothing here clears via null: name and life_event_id are
    non-nullable (a null is ignored), and image_url:null is ignored too
    (removing a photo isn't a step-07 flow)."""

    name: Optional[str] = Field(default=None, max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    life_event_id: Optional[str] = Field(default=None, max_length=100)
    # Flip a wishlist's visibility; an omitted field leaves it untouched.
    privacy_type: Optional[PrivacyType] = None


class WishlistOwnerCreate(BaseModel):
    """POST /wishlists/{id}/owners body: the user id to promote to co-owner."""

    user_id: str = Field(max_length=256)


class ActionResponse(BaseModel):
    """The success/message envelope the owner mutations return (they change an
    owner edge, not the wishlist itself, so there's no record to echo)."""

    success: bool
    message: str


class Wishlist(BaseModel):
    """A wishlist record as stored. created_by is the creator (the first owner
    and the CreatedByIndex key); ownership itself lives in the wishlist-owners
    join table, so a wishlist can have co-owners the creator added (step 14).
    Access is checked against that table via check_wishlist_access, never
    against created_by."""

    id: str
    name: str
    image_url: Optional[str] = None
    life_event_id: str
    created_by: str
    created_at: str
    # Public or private (see PrivacyType). Defaults public so a wishlist stored
    # before this field existed still serializes and reads exactly as it did
    # before privacy landed, so nothing pre-existing silently turns private.
    privacy_type: PrivacyType = "public"
    # Denormalized love tally (step 10). Defaults 0 so a wishlist created before
    # loves existed still serializes; maintained by adjust_count on love/unlove.
    love_count: int = 0

    # The bucket is private, so the stored image_url is not directly fetchable
    # — re-sign it into a short-lived GET URL on every read. External URLs and
    # None pass through untouched.
    @field_serializer("image_url", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)
