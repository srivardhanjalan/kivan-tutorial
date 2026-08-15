from pydantic import BaseModel

from app.models.users import Role


class RoleUpdate(BaseModel):
    """PATCH /admin/users/{id}/role body. `role` is the two-value Role literal,
    so a bogus value is rejected as a 422 by Pydantic before the route runs —
    the route never has to validate the string itself."""

    role: Role
