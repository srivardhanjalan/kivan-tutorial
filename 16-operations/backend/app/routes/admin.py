from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import users_table
from app.dependencies.auth import require_admin
from app.models.admin import RoleUpdate
from app.models.users import ADMIN_ROLE, User
from app.utils.dynamo import query_all_pages, update_item_fields
from app.utils.timestamps import utc_now_iso

# The admin surface: the first readers of the role field and the require_admin
# gate. Its own domain, its own file — main.py assembles it alongside the rest.
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[User])
def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _admin_id: str = Depends(require_admin),
):
    """The user roster for an admin, newest first, one page at a time.

    Every user shares the constant "USER" partition, so PopularUsersIndex is
    the all-users access path (a Query, never a Scan) the popular rail already
    reads; here we read it whole, re-sort by created_at, and slice the page.
    Small-index-read-then-slice, the same shape as get_popular_users — honest
    at this app's scale, and the page bounds keep a large response paged."""
    users = query_all_pages(
        users_table,
        IndexName="PopularUsersIndex",
        KeyConditionExpression=Key("entity_type").eq("USER"),
    )
    users.sort(key=lambda u: u.get("created_at", ""), reverse=True)
    return users[offset:offset + limit]


@router.patch("/users/{user_id}/role", response_model=User)
def set_user_role(
    user_id: str,
    body: RoleUpdate,
    admin_id: str = Depends(require_admin),
):
    """Promote or demote a user. The body's Role literal 422s a bogus value
    before this runs; update_item_fields 404s a user id that doesn't exist.

    An admin may not demote themselves: dropping your own admin could strand
    the instance with no admin at all (default-deny means no one could restore
    it without the operator script). That is a conflict with the current state,
    not a malformed request, so it is a 409 — demote another admin instead."""
    if user_id == admin_id and body.role != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An admin cannot remove their own admin role",
        )
    return update_item_fields(
        users_table,
        {"id": user_id},
        {"role": body.role, "updated_at": utc_now_iso()},
        "User not found",
    )
