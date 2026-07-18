from typing import Optional

from pydantic import BaseModel


class User(BaseModel):
    """The user record as JIT provisioning writes it. Pydantic ignores extra
    item fields by default, so later steps can add fields to the DynamoDB
    record without breaking this model."""

    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    onboarding_completed: bool = False
    created_at: str
    updated_at: str


class OnboardingStatus(BaseModel):
    onboarding_completed: bool
