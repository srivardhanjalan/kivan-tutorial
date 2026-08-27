from typing import Literal, Optional

from pydantic import BaseModel, Field, PastDate, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3

# The global user role (step 15). Two values only; a record provisioned before
# this step carries no `role` attribute, so DEFAULT_ROLE is the read-side
# default the model fills in and every gate treats as non-admin. This is why
# no data backfill is needed: absence reads as "user", airtight because only
# an explicit role == ADMIN_ROLE ever grants access.
Role = Literal["user", "admin"]
DEFAULT_ROLE: Role = "user"
ADMIN_ROLE: Role = "admin"


class User(BaseModel):
    """The user record as JIT provisioning writes it (profile fields join as
    the user fills them in). Pydantic ignores extra item fields by default,
    so later steps can add fields to the DynamoDB record without breaking
    this model."""

    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    cover_photo: Optional[str] = None
    birthday: Optional[str] = None  # ISO date (YYYY-MM-DD)
    birthday_prompt_dismissed: bool = False
    onboarding_completed: bool = False
    # Global role (step 15). Provisioning writes "user"; a record created before
    # this step has no attribute and reads as the default. Only the grant-admin
    # operator script and PATCH /admin/users/{id}/role ever write "admin".
    role: Role = DEFAULT_ROLE
    created_at: str
    updated_at: str

    # The bucket is private, so the stored image_url/cover_photo are not
    # directly fetchable — re-sign them into short-lived GET URLs on every
    # read. External URLs (Clerk avatars) and None pass through untouched.
    @field_serializer("image_url", "cover_photo", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)


class UserWithCounts(User):
    """A public profile: the user plus their denormalized social counts and,
    for the viewer, whether they follow this user. The counts default to 0 so
    a record provisioned before step 10 (no count attributes) still serializes.
    is_following is None when it doesn't apply (the viewer looking at their
    own profile) and a bool otherwise."""

    follower_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = None


class UserUpdate(BaseModel):
    """PUT /users/me body — every field optional; only the ones sent change.
    `birthday` must parse as a real date in the past. image_url/cover_photo
    carry a `pending/` upload URL the route claims into permanent storage."""

    # Length caps, same discipline as the wish/wishlist models: a validated
    # body must never be able to blow past DynamoDB's 400 KB item limit and
    # 500 in the serializer instead of 422-ing here.
    first_name: Optional[str] = Field(default=None, max_length=200)
    last_name: Optional[str] = Field(default=None, max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    cover_photo: Optional[str] = Field(default=None, max_length=2048)
    birthday: Optional[PastDate] = None
    birthday_prompt_dismissed: Optional[bool] = None


class AccountDeletionRequest(BaseModel):
    """The confirmation the danger zone collects — literally the word DELETE."""

    confirmation_text: str


class OnboardingStatus(BaseModel):
    onboarding_completed: bool
