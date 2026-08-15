from typing import Literal, Optional

from pydantic import BaseModel, Field, field_serializer

from app.models.users import User
from app.models.wishlists import Wishlist
from app.utils.s3_helpers import get_signed_url_for_s3


class EventCreate(BaseModel):
    """POST /events/ body. Every field but name is optional: an event needs a
    title, nothing more. event_type is a life-event id (the client picks from
    GET /life-events); it is stored verbatim and never re-validated against the
    catalog, the same laxness wishlists give life_event_id. image_url carries a
    `pending/` upload URL the route claims. Co-hosts and invitees are added
    through their own endpoints after creation, not in this body."""

    # Length caps, the same discipline the wish/wishlist models carry: a
    # validated body must never be able to blow past DynamoDB's 400 KB item
    # limit and 500 in the serializer instead of 422-ing here.
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    is_public: bool = False
    event_type: Optional[str] = Field(default=None, max_length=100)
    event_date: Optional[str] = Field(default=None, max_length=64)  # ISO 8601
    location: Optional[str] = Field(default=None, max_length=500)

    # Invite people right when the event is born. Both lists flow through the
    # SAME add-invitees helper the add-later route uses (the user/email split
    # lives in one place): user ids the server validates against the users table,
    # raw emails it trusts verbatim (an address invited before it has an account,
    # claimed once that person signs up). Co-hosts are still added post-create
    # through their own endpoint, so they aren't part of this body.
    invitee_ids: Optional[list[str]] = None
    invitee_emails: Optional[list[str]] = None


class EventUpdate(BaseModel):
    """PUT /events/{id} body: send only what changes, an omitted field is left
    untouched (the route model_dumps exclude_unset). is_public IS toggleable
    here (unlike a wishlist's non-nullable fields): flipping it re-syncs the
    sparse public_marker the public feed queries on."""

    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    is_public: Optional[bool] = None
    event_type: Optional[str] = Field(default=None, max_length=100)
    event_date: Optional[str] = Field(default=None, max_length=64)
    location: Optional[str] = Field(default=None, max_length=500)


class Event(BaseModel):
    """An event record as stored. created_by is the creator, who is also auto
    inserted as the first host (hosts are a flat, role-less set: every host is
    equal, the only invariant is an event can't lose its last host)."""

    id: str
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_public: bool = False
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str

    # The bucket is private, so the stored cover URL is not directly fetchable:
    # re-sign it into a short-lived GET URL on every read. External URLs and
    # None pass through untouched (the wishlist/user cover idiom).
    @field_serializer("image_url", mode="plain")
    def _sign_photo(self, value: Optional[str]) -> Optional[str]:
        return get_signed_url_for_s3(value)


class EventWithRSVP(Event):
    """An event I'm invited to, carrying my own RSVP status. The RSVP write
    path arrives in the invitee step; this field surfaces the stored status
    (default "pending") that the email-match /me query already reads."""

    my_rsvp_status: Optional[str] = None


class MyEventsResponse(BaseModel):
    """GET /events/me: the events I host and the events I'm invited to. Invited
    events carry my RSVP; hosted events are plain (a host has no RSVP)."""

    hosting: list[Event] = []
    invited: list[EventWithRSVP] = []


class EventHostCreate(BaseModel):
    """POST /events/{id}/hosts body: the user id to promote to co-host."""

    user_id: str = Field(max_length=256)


class EventWishlistCreate(BaseModel):
    """POST /events/{id}/wishlists body: the wishlist id to link. The caller
    must own that wishlist (a host can only attach their own collections)."""

    wishlist_id: str = Field(max_length=256)


class EventInviteeCreate(BaseModel):
    """POST /events/{id}/invitees body: user ids and/or raw emails to invite
    after the event exists. The exact fields EventCreate carries inline, so both
    the create-time and add-later paths hand the same shape to one helper."""

    invitee_ids: Optional[list[str]] = None
    invitee_emails: Optional[list[str]] = None


class EventInviteeWithUser(BaseModel):
    """An invitee row, enriched with the invited person's User record when the
    invite was addressed to a user. invitee_id is the discriminated identifier:
    a Clerk user id for a "user" invite, the raw email for an "email" invite;
    `user` is populated only for user invites (an email invite stays user=None
    until that address signs up). This is the one invitee shape the API returns:
    the reference also exposed a raw, un-enriched list endpoint, but nothing
    called it, so the detail response's Guests list is the only surface here."""

    event_id: str
    invitee_id: str
    invitee_type: str  # "user" or "email"
    rsvp_status: str = "pending"  # pending | going | maybe | not_going
    invited_at: str
    invited_by: str
    user: Optional[User] = None


class UpdateRsvpRequest(BaseModel):
    """PATCH /events/{id}/invitees/{invitee_id} body. The Literal validates the
    status at the model boundary (a bad value is a 422 here, not a hand-rolled
    400 in the route), and "pending" is deliberately absent: it's the initial
    server-written state, never something an invitee sets back to."""

    rsvp_status: Literal["going", "maybe", "not_going"]


class ActionResponse(BaseModel):
    """The success/message envelope the host and wishlist-link mutations return
    (they change an edge, not the event itself, so there's no record to echo)."""

    success: bool
    message: str


class EventDetailResponse(BaseModel):
    """GET /events/{id}: the event, its hosts, its invitees (user-enriched) and
    its linked wishlists, plus how the caller relates to it: is_host unlocks the
    edit/delete/invite affordances; is_invitee and my_rsvp_status drive the RSVP
    control. my_rsvp_status is None exactly when the caller isn't an invitee (an
    invitee always carries a status, defaulting to "pending")."""

    event: Event
    hosts: list[User] = []
    invitees: list[EventInviteeWithUser] = []
    wishlists: list[Wishlist] = []
    is_host: bool = False
    is_invitee: bool = False
    my_rsvp_status: Optional[str] = None
