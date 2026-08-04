from pydantic import BaseModel


class LoveStatus(BaseModel):
    """GET /wishlists/{id}/love/status: whether the CURRENT user loves this
    wishlist. Kept off the wishlist payload on purpose: love_count is the same
    for everyone (denormalized, rides along on every wishlist), but is_loved is
    per-viewer, so the detail screen asks for it once instead of every list
    read computing a per-user lookup."""

    is_loved: bool
