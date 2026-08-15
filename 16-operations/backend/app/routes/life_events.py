from boto3.dynamodb.conditions import Attr
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import events_table, life_events_table, wishlists_table
from app.dependencies.auth import get_current_user_id, require_admin
from app.models.life_events import LifeEvent, LifeEventCreate, LifeEventUpdate
from app.utils.dynamo import (
    delete_item_or_404,
    get_item_or_404,
    put_item_or_409,
    update_item_fields,
)

router = APIRouter(prefix="/life-events", tags=["life-events"])

# The admin write side of the taxonomy, gated by require_admin (the two-router-
# per-domain idiom). Its caller is the phase-C admin dashboard's life-events
# screen.
admin_router = APIRouter(prefix="/admin/life-events", tags=["admin", "life-events"])


def _is_referenced(table, attribute: str, value: str) -> bool:
    """True if any row in `table` carries attribute == value. A filtered Scan,
    paginated to the end: a Scan reads at most 1 MB per page and applies the
    filter to that page, so a page can come back empty (Count 0) with more pages
    behind it — stop only on a real match or a truly exhausted table. The read is
    also eventually consistent (a Scan is non-consistent by default), so a row
    written moments earlier could be missed; acceptable on this rare admin path.

    This is a full Scan of a potentially large table (wishlists, events) with no
    index on the reference attribute, so it is honest ONLY because it runs on a
    rare admin delete, never a hot path — the same blessing grant_admin's
    email Scan carries. If life-event deletes ever became frequent, this would
    want a GSI on the referencing attribute."""
    kwargs = {"FilterExpression": Attr(attribute).eq(value), "Select": "COUNT"}
    response = table.scan(**kwargs)
    while True:
        if response.get("Count", 0) > 0:
            return True
        if "LastEvaluatedKey" not in response:
            return False
        response = table.scan(**kwargs, ExclusiveStartKey=response["LastEvaluatedKey"])


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


@admin_router.post("", response_model=LifeEvent, status_code=status.HTTP_201_CREATED)
def create_life_event(event: LifeEventCreate, _admin_id: str = Depends(require_admin)):
    """Add an occasion to the taxonomy. The id is the client's slug (the one the
    frontend selector matches on), put conditionally so a collision with a
    seeded occasion is a 409, not a clobber."""
    return put_item_or_409(
        life_events_table,
        event.model_dump(),
        f"A life event with id {event.id!r} already exists",
    )


@admin_router.put("/{event_id}", response_model=LifeEvent)
def update_life_event(
    event_id: str, update: LifeEventUpdate, _admin_id: str = Depends(require_admin)
):
    """Edit an occasion's fields. Field-scoped and null-ignored: only the keys
    the body carries are written."""
    changes = {
        k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None
    }
    if not changes:
        return get_item_or_404(life_events_table, event_id, "Life event not found")
    return update_item_fields(
        life_events_table, {"id": event_id}, changes, "Life event not found"
    )


@admin_router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_life_event(event_id: str, _admin_id: str = Depends(require_admin)):
    """Retire an occasion — but only if nothing points at it. A wishlist's
    life_event_id and an event's event_type are soft, unvalidated lookups (a
    create stores the string without checking this table), so deleting a
    referenced occasion would strand those records categorized against an id
    that no longer resolves. That is a deliberate contract, not silent breakage:
    409 if any wishlist or event still references it, hard delete otherwise
    (hard delete is how the seed intends an occasion to be retired). 404 if the
    id was never there."""
    if _is_referenced(wishlists_table, "life_event_id", event_id) or _is_referenced(
        events_table, "event_type", event_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This life event is still in use by a wishlist or event",
        )
    delete_item_or_404(life_events_table, {"id": event_id}, "Life event not found")
