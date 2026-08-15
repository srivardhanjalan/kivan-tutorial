from fastapi import APIRouter, Depends

from app.database import brands_table
from app.dependencies.auth import get_current_user_id
from app.models.brands import Brand

router = APIRouter(prefix="/brands", tags=["brands"])


# Auth-gated like every data route, and the id is discarded for the same
# reason storefronts does: the browse-and-capture directory sits behind the
# sign-in gate, so the point is the gate, not who is behind it.
@router.get("", response_model=list[Brand])
def list_brands(_user_id: str = Depends(get_current_user_id)):
    """The real-store directory, ordered for display. A Scan is the right
    read, exactly as for storefronts and the life-events taxonomy: a curated
    handful of reference rows with no natural key to query by, far under the
    1 MB single-page cap so one Scan page suffices. The directory screen groups
    these by category on the client, so there is no by-category endpoint here
    (one Scan feeds the whole grouped view). Sorted by (display_order, name) so
    the client grouping stays deterministic within each category."""
    brands = brands_table.scan().get("Items", [])
    brands.sort(key=lambda b: (b.get("display_order", 0), b.get("name", "")))
    return brands
