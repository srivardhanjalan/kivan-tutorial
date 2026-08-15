from typing import Optional

from pydantic import BaseModel, field_serializer

from app.utils.s3_helpers import get_signed_url_for_s3


class NotificationActor(BaseModel):
    """The user who triggered a notification, as a list row renders them: an
    avatar and a name, nothing else. A deliberately lighter projection than the
    full User model — a notification feed embeds one of these per row, so it
    carries only the display fields and not the profile's counts, timestamps,
    or onboarding flags. Pydantic ignores the extra attributes on the fetched
    user record, so the enrichment can pass the whole item straight in."""

    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None

    # The bucket is private, so a stored image_url is re-signed into a
    # short-lived GET URL on every read; external URLs and None pass through.
    @field_serializer("image_url", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)


class NotificationWithActor(BaseModel):
    """A notification enriched for display: the stored row plus its resolved
    actor and (when the row references one) a small resource summary. `resource`
    is a plain dict — {id, type, name}, plus wishlist_id for a wish so the tap
    can open the wish's parent list — rather than a typed model, because its
    shape varies by resource_type and the client only reads those keys."""

    id: str
    actor: NotificationActor
    notification_type: str
    message: str
    resource: Optional[dict] = None
    read: bool
    created_at: str


class NotificationsResponse(BaseModel):
    """GET /notifications/me: the requested page plus counts over the FULL set
    (so a badge and "N unread" render without a second call), and the cursor
    for the next page."""

    notifications: list[NotificationWithActor]
    total: int
    unread_count: int
    has_more: bool
    next_offset: Optional[int] = None


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkReadResponse(BaseModel):
    success: bool
    message: str


class NotificationSettings(BaseModel):
    """A user's notification preferences: the per-type mute flags plus whether
    email copies are on. The mutes default False (nothing muted) and email
    copies default True (opt-out), so a user who never opened the settings
    screen still serializes with sensible defaults. The mute field names match
    the Lambda consumer's f"mute_{notification_type}" derivation EXACTLY
    (singular `mute_follow`), so a muted type is actually honored; the consumer
    reads `email_notifications` by that exact name."""

    user_id: str
    mute_follow: bool = False
    mute_wishlist_created: bool = False
    mute_wish_added: bool = False
    mute_wishlist_loved: bool = False
    # Email copies of notifications (step 12). Default True, so email is on until
    # a user turns it off; the Lambda mailer honors this same default.
    email_notifications: bool = True
    updated_at: str


class NotificationSettingsUpdate(BaseModel):
    """PUT /notifications/settings body: every field optional; only the ones
    sent are written."""

    mute_follow: Optional[bool] = None
    mute_wishlist_created: Optional[bool] = None
    mute_wish_added: Optional[bool] = None
    mute_wishlist_loved: Optional[bool] = None
    email_notifications: Optional[bool] = None
