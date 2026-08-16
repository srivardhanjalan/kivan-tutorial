"""Events (step 13, phase A): core CRUD, the my-events split, public vs private
visibility, host management, wishlist linking, the delete cascade, and the cover
photo's pending → permanent claim. Everything runs against moto (DynamoDB and,
for the cover, S3): no AWS account, no network.

The `client` fixture stands in for Clerk: `client("uid")` returns a TestClient
authenticated as that user id. Call it immediately before each request: the
override is replaced per call, so the last `client(...)` wins.
"""
import boto3

from conftest import (
    EVENT_HOSTS_TABLE,
    EVENT_INVITEES_TABLE,
    EVENT_WISHLISTS_TABLE,
    EVENTS_TABLE,
    put_user,
    put_wishlist,
)


def _create_event(client, uid, **fields):
    """Create an event as `uid`, returning the response (fields override the
    minimal {name})."""
    body = {"name": "Sam's Birthday", **fields}
    return client(uid).post("/events/", json=body)


# ── Create + auto-host ───────────────────────────────────────────────────────


def test_create_event_roundtrips_and_auto_hosts(client, aws):
    """(a) Create round-trips every field and stamps the creator; and the
    creator is auto-inserted as the event's first host."""
    put_user(aws, "host")

    resp = _create_event(
        client,
        "host",
        description="Cake and games",
        is_public=True,
        event_type="birthday",
        event_date="2026-09-01T18:00:00+00:00",
        location="Sam's place",
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Sam's Birthday"
    assert body["description"] == "Cake and games"
    assert body["is_public"] is True
    assert body["event_type"] == "birthday"
    assert body["event_date"] == "2026-09-01T18:00:00+00:00"
    assert body["location"] == "Sam's place"
    assert body["created_by"] == "host"

    # The creator is a host row, keyed (event_id, user_id).
    host_row = aws.Table(EVENT_HOSTS_TABLE).get_item(
        Key={"event_id": body["id"], "user_id": "host"}
    )
    assert "Item" in host_row


# ── /events/me ───────────────────────────────────────────────────────────────


def test_my_events_lists_hosting(client, aws):
    """(b) An event I create shows up under /events/me's hosting list."""
    put_user(aws, "host")
    event_id = _create_event(client, "host").json()["id"]

    resp = client("host").get("/events/me")

    assert resp.status_code == 200
    body = resp.json()
    assert [e["id"] for e in body["hosting"]] == [event_id]
    assert body["invited"] == []


def test_my_events_surfaces_invite_by_user_and_email(client, aws):
    """The invited list is gathered by BOTH user id and email. A row addressed
    to my email (before I had an account) surfaces once I sign up with it, and
    carries its RSVP status."""
    put_user(aws, "guest")  # email seeded as guest@example.com
    event_id = _create_event(client, "host").json()["id"]
    aws.Table(EVENT_INVITEES_TABLE).put_item(
        Item={
            "event_id": event_id,
            "invitee_id": "guest@example.com",
            "invitee_type": "email",
            "rsvp_status": "going",
            "invited_at": "2026-01-01T00:00:00+00:00",
            "invited_by": "host",
        }
    )

    resp = client("guest").get("/events/me")

    body = resp.json()
    assert body["hosting"] == []
    assert [e["id"] for e in body["invited"]] == [event_id]
    assert body["invited"][0]["my_rsvp_status"] == "going"


# ── Visibility: public vs private ────────────────────────────────────────────


def test_public_event_visible_to_stranger(client, aws):
    """(d) A public event does not 403 a non-invitee: tapping one from the
    public feed must open."""
    put_user(aws, "host")
    event_id = _create_event(client, "host", is_public=True).json()["id"]

    resp = client("stranger").get(f"/events/{event_id}")

    assert resp.status_code == 200
    assert resp.json()["is_host"] is False


def test_private_event_403s_stranger(client, aws):
    """(d) A private event 403s someone who is neither host nor invitee, while
    its host still reads it (proving the 403 is an access check, not a block)."""
    put_user(aws, "host")
    event_id = _create_event(client, "host", is_public=False).json()["id"]

    assert client("stranger").get(f"/events/{event_id}").status_code == 403
    assert client("host").get(f"/events/{event_id}").status_code == 200


def test_public_feed_lists_only_public(client, aws):
    """(d) The public feed returns public events and never private ones."""
    put_user(aws, "host")
    public_id = _create_event(client, "host", is_public=True).json()["id"]
    _create_event(client, "host", is_public=False)

    resp = client("host").get("/events/public")

    assert resp.status_code == 200
    assert [e["id"] for e in resp.json()] == [public_id]


def test_update_toggles_public_marker(client, aws):
    """A private event is absent from the public feed; flipping is_public true
    adds it (the sparse marker is SET), flipping back removes it (REMOVE)."""
    put_user(aws, "host")
    event_id = _create_event(client, "host", is_public=False).json()["id"]
    assert client("host").get("/events/public").json() == []

    client("host").put(f"/events/{event_id}", json={"is_public": True})
    assert [e["id"] for e in client("host").get("/events/public").json()] == [event_id]

    client("host").put(f"/events/{event_id}", json={"is_public": False})
    assert client("host").get("/events/public").json() == []


# ── Update / access ──────────────────────────────────────────────────────────


def test_update_event_host_only(client, aws):
    """The host can edit; a non-host is 403 and the stored name is untouched."""
    put_user(aws, "host")
    event_id = _create_event(client, "host").json()["id"]

    assert (
        client("stranger").put(f"/events/{event_id}", json={"name": "Hijacked"}).status_code
        == 403
    )
    resp = client("host").put(f"/events/{event_id}", json={"name": "Renamed"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"


def test_get_missing_event_is_404(client, aws):
    """A GET for an event that does not exist is a 404, not a 403."""
    assert client("host").get("/events/nope").status_code == 404


# ── Host management ──────────────────────────────────────────────────────────


def test_add_host(client, aws):
    """A host can promote a real user to co-host, who then appears in the
    detail's hosts; a duplicate is 400 and an unknown user is 404."""
    put_user(aws, "host")
    put_user(aws, "cohost", first_name="Co", last_name="Host")
    event_id = _create_event(client, "host").json()["id"]

    assert client("host").post(
        f"/events/{event_id}/hosts", json={"user_id": "cohost"}
    ).status_code == 200
    host_ids = {h["id"] for h in client("host").get(f"/events/{event_id}").json()["hosts"]}
    assert host_ids == {"host", "cohost"}

    # Adding the same user again is a 400; an unknown user is a 404.
    assert client("host").post(
        f"/events/{event_id}/hosts", json={"user_id": "cohost"}
    ).status_code == 400
    assert client("host").post(
        f"/events/{event_id}/hosts", json={"user_id": "ghost"}
    ).status_code == 404


def test_add_host_non_host_forbidden(client, aws):
    """Only a host can add hosts."""
    put_user(aws, "host")
    put_user(aws, "cohost")
    event_id = _create_event(client, "host").json()["id"]

    assert client("stranger").post(
        f"/events/{event_id}/hosts", json={"user_id": "cohost"}
    ).status_code == 403


def test_remove_host_and_last_host_guard(client, aws):
    """A co-host can be removed, but an event can never lose its last host."""
    put_user(aws, "host")
    put_user(aws, "cohost")
    event_id = _create_event(client, "host").json()["id"]
    client("host").post(f"/events/{event_id}/hosts", json={"user_id": "cohost"})

    assert client("host").delete(f"/events/{event_id}/hosts/cohost").status_code == 200
    # Only the creator remains, so removing them is refused.
    assert client("host").delete(f"/events/{event_id}/hosts/host").status_code == 400


# ── Wishlist linking ─────────────────────────────────────────────────────────


def test_link_and_unlink_wishlist(client, aws):
    """A host links a wishlist they own; the detail returns it; unlinking
    removes it again."""
    put_user(aws, "host")
    put_wishlist(aws, "wl", created_by="host", name="Sam's list")
    event_id = _create_event(client, "host").json()["id"]

    assert client("host").post(
        f"/events/{event_id}/wishlists", json={"wishlist_id": "wl"}
    ).status_code == 200
    detail = client("host").get(f"/events/{event_id}").json()
    assert [w["id"] for w in detail["wishlists"]] == ["wl"]

    assert client("host").delete(f"/events/{event_id}/wishlists/wl").status_code == 200
    assert client("host").get(f"/events/{event_id}").json()["wishlists"] == []


def test_link_wishlist_non_owner_forbidden(client, aws):
    """A host can only link wishlists they OWN: linking someone else's is a
    403, and nothing gets linked."""
    put_user(aws, "host")
    put_wishlist(aws, "wl", created_by="other", name="Not yours")
    event_id = _create_event(client, "host").json()["id"]

    assert client("host").post(
        f"/events/{event_id}/wishlists", json={"wishlist_id": "wl"}
    ).status_code == 403
    assert client("host").get(f"/events/{event_id}").json()["wishlists"] == []


def test_link_wishlist_duplicate_is_400(client, aws):
    """Linking the same wishlist twice is a 400."""
    put_user(aws, "host")
    put_wishlist(aws, "wl", created_by="host")
    event_id = _create_event(client, "host").json()["id"]
    client("host").post(f"/events/{event_id}/wishlists", json={"wishlist_id": "wl"})

    assert client("host").post(
        f"/events/{event_id}/wishlists", json={"wishlist_id": "wl"}
    ).status_code == 400


# ── Invitees & RSVP ──────────────────────────────────────────────────────────


def _invitee(detail, invitee_id):
    """The invitee entry for an id within a detail response, or None."""
    return next(
        (i for i in detail["invitees"] if i["invitee_id"] == invitee_id), None
    )


def test_create_time_invitees_both_kinds(client, aws):
    """Create-time invites go through the shared helper: a known user id is
    added as a user invitee, an email as an email invitee, and an unknown user
    id is silently skipped (the helper validates ids against the users table)."""
    put_user(aws, "host")
    put_user(aws, "friend", first_name="Fran", last_name="Ng")

    event_id = _create_event(
        client,
        "host",
        invitee_ids=["friend", "ghost"],
        invitee_emails=["nobody@example.com"],
    ).json()["id"]

    detail = client("host").get(f"/events/{event_id}").json()
    ids = {i["invitee_id"] for i in detail["invitees"]}
    assert ids == {"friend", "nobody@example.com"}  # ghost (no account) skipped


def test_add_later_invitees_both_kinds_and_idempotent(client, aws):
    """The add-later route reuses the same helper: user and email invites land,
    and re-inviting an existing identifier is a no-op skip (no duplicate row,
    no error)."""
    put_user(aws, "host")
    put_user(aws, "friend")
    event_id = _create_event(client, "host").json()["id"]

    resp = client("host").post(
        f"/events/{event_id}/invitees",
        json={"invitee_ids": ["friend"], "invitee_emails": ["nobody@example.com"]},
    )
    assert resp.status_code == 200
    # Re-invite the same two: still 200, still exactly two invitee rows.
    client("host").post(
        f"/events/{event_id}/invitees",
        json={"invitee_ids": ["friend"], "invitee_emails": ["nobody@example.com"]},
    )
    detail = client("host").get(f"/events/{event_id}").json()
    assert len(detail["invitees"]) == 2


def test_invitee_list_enrichment(client, aws):
    """A user invitee carries the invited person's nested User record; an email
    invitee (no account) leaves user=None."""
    put_user(aws, "host")
    put_user(aws, "friend", first_name="Fran", last_name="Ng")
    event_id = _create_event(
        client, "host", invitee_ids=["friend"], invitee_emails=["nobody@example.com"]
    ).json()["id"]

    detail = client("host").get(f"/events/{event_id}").json()

    user_invitee = _invitee(detail, "friend")
    assert user_invitee["invitee_type"] == "user"
    assert user_invitee["user"]["id"] == "friend"
    assert user_invitee["user"]["first_name"] == "Fran"

    email_invitee = _invitee(detail, "nobody@example.com")
    assert email_invitee["invitee_type"] == "email"
    assert email_invitee["user"] is None


def test_add_invitees_host_only(client, aws):
    """Only a host can add invitees."""
    put_user(aws, "host")
    put_user(aws, "friend")
    event_id = _create_event(client, "host").json()["id"]

    assert (
        client("stranger")
        .post(f"/events/{event_id}/invitees", json={"invitee_ids": ["friend"]})
        .status_code
        == 403
    )


def test_remove_invitee_host_only(client, aws):
    """A host can remove an invitee; a non-host cannot."""
    put_user(aws, "host")
    put_user(aws, "friend")
    event_id = _create_event(client, "host", invitee_ids=["friend"]).json()["id"]

    assert (
        client("stranger").delete(f"/events/{event_id}/invitees/friend").status_code
        == 403
    )
    assert client("host").delete(f"/events/{event_id}/invitees/friend").status_code == 200
    assert client("host").get(f"/events/{event_id}").json()["invitees"] == []


def test_rsvp_happy_and_self_only(client, aws):
    """(f) An invitee sets their own RSVP and it persists to their detail view;
    only that invitee may set it (a non-invitee is 403), an unknown invitee row
    is 404, and an out-of-set status is rejected by the model (422)."""
    put_user(aws, "host")
    put_user(aws, "friend")
    event_id = _create_event(client, "host", invitee_ids=["friend"]).json()["id"]

    resp = client("friend").patch(
        f"/events/{event_id}/invitees/friend", json={"rsvp_status": "going"}
    )
    assert resp.status_code == 200
    mine = client("friend").get(f"/events/{event_id}").json()
    assert mine["is_invitee"] is True
    assert mine["my_rsvp_status"] == "going"

    # Someone who isn't that invitee cannot set it.
    assert (
        client("stranger")
        .patch(f"/events/{event_id}/invitees/friend", json={"rsvp_status": "maybe"})
        .status_code
        == 403
    )
    # No such invitee row → 404.
    assert (
        client("friend")
        .patch(f"/events/{event_id}/invitees/ghost", json={"rsvp_status": "going"})
        .status_code
        == 404
    )
    # A status outside going|maybe|not_going is a validation error.
    assert (
        client("friend")
        .patch(f"/events/{event_id}/invitees/friend", json={"rsvp_status": "pending"})
        .status_code
        == 422
    )


def test_rsvp_by_email_identifier(client, aws):
    """(h) An email invite is RSVP-able by its address once that person signs
    in: they PATCH the row keyed by their email, and it surfaces in /events/me."""
    put_user(aws, "host")
    put_user(aws, "guest")  # email seeded as guest@example.com
    event_id = _create_event(client, "host").json()["id"]
    client("host").post(
        f"/events/{event_id}/invitees",
        json={"invitee_emails": ["guest@example.com"]},
    )

    resp = client("guest").patch(
        f"/events/{event_id}/invitees/guest@example.com",
        json={"rsvp_status": "going"},
    )
    assert resp.status_code == 200

    invited = client("guest").get("/events/me").json()["invited"]
    assert [e["id"] for e in invited] == [event_id]
    assert invited[0]["my_rsvp_status"] == "going"


# ── Delete cascade ───────────────────────────────────────────────────────────


def test_delete_event_cascades_child_rows(client, aws):
    """(k) Deleting an event removes every child row: hosts, invitees, and
    wishlist links (the cover object is covered by the S3 test)."""
    put_user(aws, "host")
    put_user(aws, "cohost")
    put_wishlist(aws, "wl", created_by="host")
    event_id = _create_event(client, "host").json()["id"]
    client("host").post(f"/events/{event_id}/hosts", json={"user_id": "cohost"})
    client("host").post(f"/events/{event_id}/wishlists", json={"wishlist_id": "wl"})
    aws.Table(EVENT_INVITEES_TABLE).put_item(
        Item={
            "event_id": event_id,
            "invitee_id": "guest@example.com",
            "invitee_type": "email",
            "rsvp_status": "pending",
            "invited_at": "2026-01-01T00:00:00+00:00",
            "invited_by": "host",
        }
    )

    assert client("host").delete(f"/events/{event_id}").status_code == 204

    from boto3.dynamodb.conditions import Key

    assert "Item" not in aws.Table(EVENTS_TABLE).get_item(Key={"id": event_id})
    for table in (EVENT_HOSTS_TABLE, EVENT_INVITEES_TABLE, EVENT_WISHLISTS_TABLE):
        remaining = aws.Table(table).query(
            KeyConditionExpression=Key("event_id").eq(event_id)
        )["Items"]
        assert remaining == [], f"{table} still had rows after delete"


def test_delete_event_host_only(client, aws):
    """A non-host cannot delete an event."""
    put_user(aws, "host")
    event_id = _create_event(client, "host").json()["id"]

    assert client("stranger").delete(f"/events/{event_id}").status_code == 403
    assert client("host").get(f"/events/{event_id}").status_code == 200


# ── Cover photo: pending → permanent claim, and delete ───────────────────────


def _head_exists(s3, bucket, key) -> bool:
    from botocore.exceptions import ClientError

    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError:
        return False


def test_cover_photo_claimed_on_create_and_deleted_on_delete(client, aws, monkeypatch):
    """(c/k) A pending cover is claimed into the permanent keyspace on create
    (pending object gone, permanent object present), and the permanent object is
    deleted when the event is deleted."""
    from app.config import settings

    bucket = "kivan-test-photos"
    monkeypatch.setattr(settings, "photos_bucket_name", bucket)
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=bucket)

    # A pending upload stamped with the caller's id (upload.py's key shape).
    pending_key = "pending/event_photo/host/cover.jpg"
    permanent_key = "event_photo/host/cover.jpg"
    s3.put_object(Bucket=bucket, Key=pending_key, Body=b"img")
    pending_url = f"https://{bucket}.s3.us-east-1.amazonaws.com/{pending_key}"

    put_user(aws, "host")
    resp = _create_event(client, "host", image_url=pending_url)
    assert resp.status_code == 201
    event_id = resp.json()["id"]
    # The response cover is a signed read of the PERMANENT object.
    assert permanent_key in resp.json()["image_url"]

    assert not _head_exists(s3, bucket, pending_key)  # claimed out of pending
    assert _head_exists(s3, bucket, permanent_key)  # ...into permanent

    assert client("host").delete(f"/events/{event_id}").status_code == 204
    assert not _head_exists(s3, bucket, permanent_key)  # deleted with the event


def test_signed_url_accepts_event_photo(aws, client, monkeypatch):
    """The signed-url gate must accept event_photo — EventFormScreen's cover
    upload starts here, and a Literal that omits it 422s the whole flow
    before any S3 call (this exact regression shipped in this step's first
    cut: the claim path knew events, the mint path did not)."""
    from app.config import settings

    bucket = "kivan-test-photos"
    monkeypatch.setattr(settings, "photos_bucket_name", bucket)
    s3 = boto3.client("s3", region_name="us-east-1")
    s3.create_bucket(Bucket=bucket)

    put_user(aws, "host")
    resp = client("host").post(
        "/upload/signed-url",
        json={"resource_type": "event_photo", "file_extension": "jpeg"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "pending/event_photo/host/" in body["photo_url"]
    assert body["upload_url"].startswith("https://")
