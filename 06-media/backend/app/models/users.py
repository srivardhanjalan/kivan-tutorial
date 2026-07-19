from typing import Optional

from pydantic import BaseModel, PastDate, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


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
    created_at: str
    updated_at: str

    # The bucket is private, so the stored image_url/cover_photo are not
    # directly fetchable — re-sign them into short-lived GET URLs on every
    # read. External URLs (Clerk avatars) and None pass through untouched.
    @field_serializer("image_url", "cover_photo", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)


class UserUpdate(BaseModel):
    """PUT /users/me body — every field optional; only the ones sent change.
    `birthday` must parse as a real date in the past. image_url/cover_photo
    carry a `pending/` upload URL the route claims into permanent storage."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    cover_photo: Optional[str] = None
    birthday: Optional[PastDate] = None
    birthday_prompt_dismissed: Optional[bool] = None


class AccountDeletionRequest(BaseModel):
    """The confirmation the danger zone collects — literally the word DELETE."""

    confirmation_text: str


class OnboardingStatus(BaseModel):
    onboarding_completed: bool
