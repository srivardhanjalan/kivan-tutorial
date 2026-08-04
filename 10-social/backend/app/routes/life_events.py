from fastapi import APIRouter, Depends

from app.database import life_events_table
from app.dependencies.auth import get_current_user_id
from app.models.life_events import LifeEvent

router = APIRouter(prefix="/life-events", tags=["life-events"])


# Auth-gated like every data route (only / and /health stay open — App
# Runner's health checks can't carry a token) — reference data is no exception.
# The client only asks for the taxonomy once signed in (the wishlist-creation
# screen sits behind the gate), so `_user_id` is discarded: the point here is
# the gate itself, not who is behind it.
@router.get("", response_model=list[LifeEvent])
def get_life_events(_user_id: str = Depends(get_current_user_id)):
    """The seeded taxonomy, ordered for display. A Scan is the right read here:
    the table is a handful of reference rows with no natural key to query by."""
    events = life_events_table.scan().get("Items", [])
    events.sort(key=lambda e: e.get("display_order", 0))
    return events
