from fastapi import APIRouter, Depends

from app.database import storefronts_table
from app.dependencies.auth import get_current_user_id
from app.models.storefronts import Storefront

router = APIRouter(prefix="/storefronts", tags=["storefronts"])


# Auth-gated like every data route (only / and /health stay open: App Runner's
# health checks can't carry a token). The Wish Store tab sits behind the sign-in
# gate, so `_user_id` is discarded: the point here is the gate itself, not who
# is behind it (the same shape as GET /life-events).
@router.get("", response_model=list[Storefront])
def list_storefronts(_user_id: str = Depends(get_current_user_id)):
    """The curated catalog of stores, ordered for display. A Scan is the right
    read: a handful of curated reference rows with no natural key to query by,
    exactly like the life-events taxonomy (and, like it, far under the 1 MB
    single-page cap, so one Scan page suffices)."""
    storefronts = storefronts_table.scan().get("Items", [])
    storefronts.sort(key=lambda s: s.get("display_order", 0))
    return storefronts
