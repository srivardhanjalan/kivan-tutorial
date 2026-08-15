# Step 13: Events

Everything so far has been about the *things* people want: wishlists, wishes,
loves, follows. This step adds the *occasions* those things gather around. An
**event** is a birthday, a wedding, a housewarming: it has a cover, a date and a
place, one or more **hosts**, a guest list of **invitees** who **RSVP**, and the
**wishlists** the hosts attach so guests know what to bring.

It is a big step, so it landed in three phases: the data model and core CRUD, the
guest list and RSVP flow, and the notification integration. What you see here is
all three, as one feature.

Two things this step is deliberately **honest** about, because the obvious
assumption is wrong in both cases:

- **An event has one cover photo, not a photo gallery.** The cover is the exact
  same single-image idiom a wishlist or a wish uses (pending upload → claimed on
  save, old object deleted on replace). There is no gallery table, endpoint, or
  screen. Do not build one; the feature never had it.
- **Inviting a non-user by email sends no email.** A user invite writes a row
  keyed by the user id and fires an in-app (and, on a configured stack, emailed)
  notification. An email invite writes a row keyed by the raw address and does
  **nothing else**: no mail, no token, no deep link. That address simply becomes
  a **pending invite** it can claim later, the moment someone signs in with it
  (it surfaces in their `/events/me` by email match and is RSVP-able by that
  address). The UI says "Invited", never "Invitation emailed", because the
  latter would be a lie.

**The exact delta this step adds:**
[PR #PLACEHOLDER · Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/PLACEHOLDER/files)

## Run it locally

Same two terminals as every UI step. Events are pure app + DynamoDB, so the whole
feature works locally; only the emailed *copy* of an event notification needs the
deployed Lambda (locally the in-app row still writes, no mail is sent).

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_... .venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npx expo install            # SDK-matched versions, never hand-pinned
npx expo start -c --localhost
```

Create an event from **My Stuff → My Events → New Event**, pick a life event and
a wishlist, invite a co-host and some guests, and open the event to RSVP and see
the guest list.

## Running the backend tests

The moto suite is **65 green**. The events surface is covered by
`test_events.py` (25 tests): create + auto-host, the my-events split, public vs
private visibility, host management with the last-host guard, wishlist
link/unlink with ownership, both invite paths (user and email) with idempotent
re-invites, the RSVP self-only rule and the email-identifier RSVP path, the
delete cascade, and the cover photo's pending → permanent claim against real
(moto) S3. The notification integration adds `test_event_notifications.py` (5
tests: the `event_created` fan-out to followers, the `event_invitation` fan-out
targeted at user invitees only with email invitees never notified, the add-later
path firing from the same shared helper, and a re-invite staying silent), plus
the two event mutes and the six-type derivation property in
`test_notification_settings.py` and an event notification riding the generic
email template in `test_notification_email.py`.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest
```

The suite works on Python 3.11 to 3.13 (pydantic-core has no 3.14 wheel yet).

## Deploy it

This step adds **four DynamoDB tables** and the IAM to reach them; the queue, the
Lambda, and the email leg are all step 11/12's, unchanged.

```bash
cd infra
terraform apply             # + events, event_hosts, event_invitees, event_wishlists
                            #   tables and the backend's IAM grants on them
./scripts/deploy.sh         # rebuild :latest with the events routes
```

The new tables:

- **`events`**: one row per event, hash `id`. A sparse `PublicEventsIndex`
  (`public_marker` present only on public events, ranged by `created_at`) makes
  the public feed a Query, not a Scan; a boolean can't be a GSI key, so the
  marker attribute is written only when the event is public and removed when it
  flips private.
- **`event_hosts`**: one row per host edge `(event_id, user_id)`; `UserIdIndex`
  flips it to "events I host" for `/events/me`.
- **`event_invitees`**: one row per invite `(event_id, invitee_id)`, where
  `invitee_id` is a **user id OR an email**; `InviteeIdIndex` answers "events I'm
  invited to" (queried by both id and email). The RSVP status lives on this row.
- **`event_wishlists`**: one row per link `(event_id, wishlist_id)`.

The Lambda needs **no change and no new grant** for events: it is type-agnostic
(it writes any notification type and mutes it by the `f"mute_{type}"` derivation),
and event notifications ride the same generic email template as every other type.
Resource enrichment for the tap-through (the event's `{id, type, name}`) happens
on the backend read side, which already has events-table access.

## What's here (the events delta over step 12)

```
backend/
  app/models/events.py            NEW. Event, EventCreate/Update, the invitee +
                                  RSVP models (RSVP status is a Literal, so an
                                  invalid value is a 422, not a hand-rolled 400)
  app/routes/events.py            NEW. The whole events surface: CRUD, /me,
                                  /public, hosts, invitees + RSVP, wishlist link.
                                  ONE shared add_invitees helper does the
                                  user/email split for both create-time and
                                  add-later invites, and notifies the added user
                                  invitees. create_event fans event_created out
  app/utils/notifications.py      + notify_event_created (follower fan-out) and
                                  notify_event_invitation (user invitees only)
  app/models/notifications.py     + mute_event_created / mute_event_invitation
  app/routes/notifications.py     + event in the resource-enrichment tables and
                                  the two mutes in the writable set
  app/main.py, app/database.py,   + the events router, the four event tables,
  app/config.py                   and event_photo as an upload resource type
frontend/
  src/screens/EventFormScreen.tsx     NEW. Create + edit an event
  src/screens/EventDetailScreen.tsx   NEW. Cover, RSVP, guest list, invite
                                      modals, linked wishlists, host management
  src/components/EventCard.tsx        NEW. The event tile (with an RSVP badge)
  src/components/EventGuestList.tsx   NEW. The guest list (hosts see all;
                                      non-hosts see only who's going)
  src/components/RsvpControl.tsx      NEW. The going/maybe/can't-go chips
  src/components/InviteGuestModal.tsx NEW. Invite by user search or by email
  src/constants/rsvpLabels.ts         NEW. The RSVP status labels
  src/utils/formatEventDate.ts        NEW. The event date/time formatter
  src/screens/MyStuffScreen.tsx       + a My Events section (hosting + invited)
  src/constants/notificationTypeIcons.ts  + calendar / mail glyphs
  src/constants/Colors.ts             + notifyEventCreated / notifyEventInvitation
  src/screens/NotificationsScreen.tsx     + event tap → EventDetail via resource.id
  src/screens/NotificationSettingsScreen.tsx  + the two event mute rows
  src/services/api.ts                 + the event API contracts, methods, and the
                                      two new notification types + mutes
infra/
  dynamodb.tf                     + the four event tables and their GSIs
  iam.tf                          + the backend's read/write grants on them
backend/tests/
  test_events.py                  NEW. The events surface (25 tests)
  test_event_notifications.py     NEW. The two producers, wired (5 tests)
  test_notification_settings.py   + the two event mutes + the derivation property
  test_notification_email.py      + an event notification on the generic template
```

## The ideas this step plants

- **One helper for one concept.** The reference duplicated the user-vs-email
  invite split across create-time and add-later. Here a single `add_invitees`
  does both, and it is also the single place the invitation notification fires,
  so the two paths cannot drift. Only invitees actually *written* are notified,
  so a re-invite is idempotent and silent.
- **A pending invite is an identifier, not an account.** An email invite is a row
  keyed by the address. Nothing is sent; the invite is "claimed" implicitly the
  first time that address signs in, because `/events/me` and the RSVP self-check
  both accept the caller's email as an invitee key. No token, no accept endpoint,
  no email leg to fail.
- **Sparse index, honest cost.** The public feed is a Query on a marker written
  only for public events, so private events never touch the index. The
  page-in-Python slice after that Query is an honest O(all public events) for
  now, noted for a cursor when the feed outgrows one screen of pages.
- **The consumer stays type-agnostic.** Adding two notification types touched no
  Lambda code: the mute is derived as `f"mute_{type}"` and the email is one
  generic template. The type system that made the first four types muteable made
  the next two free. The settings-derivation property test locks that invariant
  for all six types at once.

## Gotchas

- **The event *is* the tap target.** An event notification's `resource.id` is the
  event id: no `wishlist_id`-style secondary key, no `event_id` fallback field.
  The feed navigates straight to `EventDetail` with `resource.id`.
- **Email invitees are never notified.** `notify_event_invitation` is only ever
  handed the *user* invitees actually added. Passing it an email would try to
  notify an account that doesn't exist. The guest list shows an email invitee by
  their address until they sign up.
- **Public means readable, not editable.** Anyone can GET a public event (so a
  link works), but every mutation (edit, delete, add host/invitee, link wishlist)
  is host-only, and only the invitee themselves can set their own RSVP.
- **An event always keeps a host.** The creator is auto-inserted as the first
  host; removing the last host is a 400. Tearing the event down is the
  delete-event path, which cascades the cover object and every host, invitee, and
  wishlist-link row.

## Done when

- [ ] Create an event with a cover, a co-host, a linked wishlist, and both a user
      and an email invitee; it appears in **My Stuff → My Events** under Hosting.
- [ ] The user invitee sees it under Invited and gets an `event_invitation`
      notification; the email invitee gets a row and **no email**.
- [ ] A public event opens for a stranger via its link; a private one 403s them.
- [ ] RSVP going/maybe/can't-go persists and shows in the guest list; only the
      invitee can set their own.
- [ ] Muting **Event created** / **Event invitations** in notification settings
      suppresses those types; `pytest` is **65 green**.

Next: `14-sharing`, which adds the `kivan://` deep links and the share-modal
family, so an event (like a wishlist or a profile) can be shared by link.
