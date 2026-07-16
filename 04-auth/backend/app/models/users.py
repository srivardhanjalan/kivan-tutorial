from typing import Optional

from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    """The user record as JIT provisioning writes it. `extra='ignore'` lets
    later steps add fields to the DynamoDB item without breaking this model."""
    model_config = ConfigDict(extra="ignore")

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


class OnboardingResponse(BaseModel):
    success: bool
    message: str
