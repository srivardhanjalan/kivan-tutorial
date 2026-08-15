from typing import Optional

from pydantic import BaseModel, Field


class LifeEventCreate(BaseModel):
    """POST /admin/life-events body. `id` is a client-supplied slug, not a minted
    uuid: life-event ids are hand-picked to mirror the frontend's EVENT_TYPES
    selector (the seed writes them by that id), so the admin dashboard supplies
    the same stable id. The route puts it conditionally, so re-using a seeded id
    (or the catch-all "general") is a 409, not a clobber.

    Length caps mirror the rest of the app: a validated body can never blow past
    DynamoDB's 400 KB item limit and 500 in the serializer instead of 422-ing
    here."""

    id: str = Field(max_length=100)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    icon: Optional[str] = Field(default=None, max_length=100)
    display_order: int = 0


class LifeEventUpdate(BaseModel):
    """PUT /admin/life-events/{id} body — send only what changes; an omitted
    field is left untouched and a present-but-None value is ignored (the same
    null-ignored discipline WishlistUpdate carries). `id` is immutable (it is the
    key, and the frontend selector matches on it)."""

    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2048)
    icon: Optional[str] = Field(default=None, max_length=100)
    display_order: Optional[int] = None


class LifeEvent(BaseModel):
    """A row of the seeded life-events taxonomy wishlists categorize against.
    Reference data: infra/scripts/seed_life_events.py is its only writer, the
    API only ever reads it (GET /life-events). Pydantic ignores extra item
    fields, so a later step can widen the seed without touching this model."""

    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
