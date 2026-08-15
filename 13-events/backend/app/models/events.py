from typing import Optional

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


class ActionResponse(BaseModel):
    """The success/message envelope the host and wishlist-link mutations return
    (they change an edge, not the event itself, so there's no record to echo)."""

    success: bool
    message: str


class EventDetailResponse(BaseModel):
    """GET /events/{id}: the event plus its hosts and linked wishlists, and
    whether the caller is a host (which unlocks the edit/delete affordances).
    Invitees and RSVP join this response in the invitee step."""

    event: Event
    hosts: list[User] = []
    wishlists: list[Wishlist] = []
    is_host: bool = False
