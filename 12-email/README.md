# Step 11: Notifications

Social gave the app a network, but it was a silent one: you could follow someone
or love their wishlist and they'd never know. This step gives the network a
**voice**. A follow, a new wishlist, a new wish, or a love now **tells the person
it happened** with an in-app notification. There's a **feed** on the fourth tab
(newest first, unread rows called out, tap to open what it points at), a **live
unread badge** on that tab, and a **settings screen** where you mute the types
you don't want.

The notification write path is **asynchronous on purpose**. A follow doesn't wait
on a notification: the route publishes a small event to an **SQS queue** and
returns immediately, and a **Lambda consumer** is the one that fans the event
out to followers and writes the rows. The user action and the notification it
triggers are decoupled, so a slow or failing consumer never slows a tap, and the
producers are best-effort (a publish failure is logged, never surfaced).

What ships here is deliberately **in-app only**. There is **no email** (that's
step 12), **no events** (`event_created` / `event_invitation` arrive in step 13),
and no push. The four types are `follow`, `wishlist_created`, `wish_added`, and
`wishlist_loved`, and nothing else.

**The exact delta this step adds:**
[PR #PLACEHOLDER · Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/PLACEHOLDER/files)

## Run it locally

Same two terminals as step 10. The two new DynamoDB tables (notifications and
notification-settings) are read through your local AWS credentials, so a full
local run wants the stack applied first (below). Everything else boots exactly as
before.

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

One honest caveat about local: the **read** side works locally (the feed, the
badge, and the settings screen all read and write the tables directly), but the
**write** side does not. A notification row is written by the Lambda consuming
SQS, and neither the queue nor the Lambda runs locally (`NOTIFICATIONS_QUEUE_URL`
is empty off AWS, so the producers no-op rather than fail). So locally the feed
renders whatever is already in the table (empty on a fresh database); to watch a
follow actually produce a notification, deploy and try it end to end there.

## Running the backend tests

Unchanged from step 10: the same pytest suite under `backend/tests/` runs the
social routes against moto's in-memory DynamoDB. This step adds no new tests:
the notification **read** routes and the async produce→consume pipeline are
exercised end to end on the deployed stack, not in the moto suite.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest
```

The suite works on Python 3.11 to 3.13 (pydantic-core has no 3.14 wheel yet), and
is 26 tests green.

## Deploy it

This step **adds infrastructure**: two DynamoDB tables (`notifications`, with a
`UserNotificationsIndex` GSI and a 90-day TTL; `notification-settings`, no GSI),
an **SQS queue** with a dead-letter queue behind it, the **notification-processor
Lambda** wired to the queue, and the IAM for all of it. The App Runner instance
now also carries `NOTIFICATIONS_QUEUE_URL` so the producers can publish.

The Lambda is **zip-deployed**, and `infra/lambda.tf` reads that zip as a file at
plan time. **You must build the zip before `terraform apply`** or the plan fails
on a missing artifact:

```bash
cd lambda
./build.sh                     # REQUIRED first: packages notification_processor.zip
cd ../infra
terraform apply                # + 2 tables, SQS + DLQ, the Lambda, and IAM
./scripts/deploy.sh            # rebuild :latest with the producers + read routes
```

`build.sh` is just a `zip` of `handler.py` (the handler imports only the standard
library and boto3, and boto3 ships with the Lambda runtime, so there's nothing to
vendor). `lambda.tf`'s `source_code_hash` is guarded by `fileexists`, so a plan
before the first build won't crash, but the apply that creates the function
needs the zip present. Rebuild the zip and re-apply whenever `handler.py` changes;
the hash change triggers the redeploy.

Deploying fresh? Follow step 03's staged bootstrap (registry, push, apply), then
build the zip and apply as above. There is nothing to seed for notifications: the
tables start empty and fill as you use the app.

**Try it end to end (on the deployed stack):** sign in as two users on two
devices (or two simulators). From user A, follow user B, create a wishlist, add a
wish to it, and love one of B's wishlists. Within about 30 seconds (or the moment
they open the tab), B's **Notifications** tab shows a red badge. Open it: the
events are there newest first, unread rows read bolder with a dot. Tap the follow
to land on A's profile; tap a wishlist notification to open that wishlist. Hit the
**mark-all** action to clear the pill. Long-press a row and confirm to delete it.
Open **Settings → Notification settings**, switch **Wishlist loved** off, and A's
next love produces no row for B.

## What's here

```
backend/                        step 10's API plus:
  app/routes/notifications.py     the READ/manage side: the feed (GET /me, paged,
                                  counts over the full set), the unread count,
                                  mark-read / mark-all, delete, and settings get/put
  app/models/notifications.py     NotificationWithActor (+ its actor/resource
                                  projection), the settings model with the four
                                  singular mute flags, the response shapes
  app/utils/notifications.py      the producers: notify_follow / _wishlist_created
                                  / _wish_added / _wishlist_loved, each resolving
                                  the recipients and building the event(s)
  app/utils/notification_queue.py the SQS publisher (single + batched sends)
  app/routes/followers.py         + fires notify_follow on a new follow
  app/routes/loves.py             + fires notify_wishlist_loved on a love
  app/routes/wishes.py            + fires notify_wish_added on a new wish
  app/routes/wishlists.py         + fires notify_wishlist_created on a new wishlist
  app/{config,database,main}.py   the queue URL, the two table handles, the router
infra/
  sqs.tf                          the notifications queue + its dead-letter queue
                                  (maxReceiveCount 3, visibility >= the Lambda timeout)
  lambda.tf                       the notification-processor function (zip-deployed,
                                  SQS event source, partial-batch-failure reporting)
                                  and its execution role
  dynamodb.tf                     + notifications (UserNotificationsIndex + 90-day
                                  TTL) and notification-settings
  iam.tf                          + SQS publish for App Runner, table access for both
  apprunner.tf / outputs.tf       inject NOTIFICATIONS_QUEUE_URL; export the queue
lambda/
  notification_processor/handler.py the ONLY writer of the notifications table:
                                  reads an SQS batch, honors each user's mutes,
                                  writes a row per recipient with a ttl
  build.sh                        packages handler.py into the deploy zip
frontend/                       step 10's app plus:
  src/screens/NotificationsScreen.tsx      the feed: focus-reload, infinite scroll,
                                  unread state, per-type icon, tap-to-open, delete
  src/screens/NotificationSettingsScreen.tsx  the four mute switches (inverted:
                                  ON = receiving), optimistic with rollback
  src/services/api.ts                      + the notification contracts (six routes)
  src/constants/Colors.ts                  + the per-type accent tokens
  src/components/TabNavigation.tsx         mounts the feed + the live unread badge
  src/components/layouts/FloatingHeaderLayout.tsx  + scroll={false} for the FlatList
  src/components/Navigation.tsx            + the NotificationSettings route
  src/screens/SettingsScreen.tsx           + the Notification settings entry
```

## The ideas this step plants

- **The action and its notification are decoupled by a queue.** A follow route's
  job is to record the follow and return. Telling people is a separate concern it
  hands to SQS: it publishes a tiny event and moves on, and the Lambda downstream
  does the fan-out and the writes. The producer is best-effort (a failed publish
  is logged, never raised), so the notification path can never fail the user's
  action.
- **One writer, many readers.** The Lambda consumer is the *only* thing that
  writes the notifications table. The API only reads it and flips read-flags. That
  single-writer rule is why the write side can be reasoned about as one place, and
  why a mute is honored exactly once, at write time, by the consumer.
- **Counts ride with the page.** `GET /notifications/me` returns the requested
  page AND the total and unread counts over the *whole* set, so the unread pill
  and the badge render without a second round trip. The feed pages in with
  `next_offset` / `has_more`.
- **A notification points somewhere, and the tap has to land.** Each type resolves
  to a screen: a follow to the actor's profile, a wishlist or a love to that
  wishlist, a new wish to the wishlist it landed in (the wish resource carries its
  `wishlist_id` so the tap has a route, not a dead end).

## Gotchas

- **The zip has to exist before `terraform apply`.** `lambda.tf` reads
  `../lambda/notification_processor.zip` as a file; the apply that creates the
  function needs it present. Run `lambda/build.sh` first, every fresh deploy, and
  again after any `handler.py` change (the hash change redeploys).
- **Literal routes before the `/{id}` catch-all.** `/notifications/unread-count`
  and `/notifications/settings` are declared before `/notifications/{notification_id}`,
  or FastAPI reads "unread-count" as a notification id and 404s.
- **The feed's timestamps are already UTC-aware.** The backend stamps `created_at`
  with a `+00:00` offset, so the feed parses it with `new Date` directly, with no
  `Z` to append because the string isn't naive. (The source app's backend sent
  naive timestamps and had to patch a `Z` on; ours doesn't, so that code would be
  dead here.)
- **A FlatList can't live inside the scroll layout.** `FloatingHeaderLayout` owns
  a ScrollView by default, and nesting a virtualized list in it breaks scrolling.
  The feed passes `scroll={false}` so its FlatList owns scrolling, and then owns
  its own header clearance and content-edge padding.
- **An authorless row is dropped, but still counted.** If a notification's actor
  was deleted after it fired, the feed skips that row (an authorless entry is
  noise) while still counting it in `total` and `unread_count`. So a page can
  render fewer rows than the page size without meaning the feed ended.

## Done when

- [ ] On the deployed stack, a follow / new wishlist / new wish / love from one
      user produces a notification for the right recipient(s); the fourth tab's
      badge appears within ~30s or the moment the tab is opened.
- [ ] Open **Notifications**: rows are newest first, unread ones read bolder with
      a dot, and the header shows an unread pill and a mark-all action.
- [ ] Tap a notification: it marks read (the pill and badge drop by one) and opens
      its target: a follow to the profile, a wishlist / love / wish to the
      wishlist.
- [ ] **Mark all read** clears the pill; a long-press on a row, confirmed, deletes
      it.
- [ ] **Settings → Notification settings**: four switches, ON = receiving. Turn one
      off and that type stops producing rows for you.
- [ ] `curl $API/notifications/me` with a valid token returns the page plus `total`
      and `unread_count`; `curl $API/notifications/unread-count` returns the badge
      number; `curl -X PUT $API/notifications/read-all` clears the unread set.

Next: `12-email`, a second consumer on the same events so a notification also
lands in the recipient's inbox.
