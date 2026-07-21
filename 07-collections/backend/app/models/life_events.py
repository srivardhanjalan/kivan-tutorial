from typing import Optional

from pydantic import BaseModel


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
