# Step 10: Social

The app has been single-player until now: your wishlists, your stuff, a catalog
you add from. This step makes it a **network**. You can search for people,
**follow** them, open anyone's **public profile**, and **love** the wishlists
you like. A profile shows who someone is, who follows them, the wishlists they
own, and the ones they've loved, and every follower count taps through to the
people behind it.

Social is a **platform feature**, not a collections one: it knows about *users*
and *wishlists*, never about life-events or the catalog. It plugs in through two
seams. Users gain the fields and indexes that make them searchable and
rankable, and a wishlist gains a public read path and a love tally. Deleting the
whole social layer would leave collections and storefronts exactly as they were.

What ships here is deliberately the follow graph and loves, nothing more. There
are **no notifications** when someone follows or loves you (that pipeline is
step 11), **no privacy** on a wishlist (every wishlist is publicly viewable this
step; public/private and co-owner visibility arrive with sharing in step 14),
and **no blocking or muting**. A wishlist you view that isn't yours is
read-only: you can love it and see its wishes, but not edit them.

**The exact delta this step adds:**
[PR #PLACEHOLDER · Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/PLACEHOLDER/files)

## Run it locally

Same two terminals as step 09. The two new DynamoDB tables and the two new user
indexes are read through your local AWS credentials, so a full local run wants
the stack applied first (below). Unlike storefronts there is **no seed**: social
data is user-generated, so the follow graph and loves fill in as you use the
app. Everything else boots exactly as before.

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

The search and Discover screens read the two new user GSIs, and those index a
user only once their record carries `entity_type`, `name_lowercase`, and the two
counts. Those fields are written at provisioning time, so **users provisioned
before this step won't appear in search or Discover until their record is
rewritten** (any profile edit does it). On a fresh local database this is a
non-issue: every user you sign in provisions with the fields already set.

## Deploy it

This step **adds infrastructure**: two DynamoDB tables (`followers`, with a
`FollowingIndex` GSI; `wishlist-loves`, no GSI), two GSIs on the existing users
table (`NameSearchIndex`, `PopularUsersIndex`), and the matching IAM grants on
the App Runner instance role. On a stack that is already up:

```bash
cd infra
terraform apply        # + 2 tables, + 2 user GSIs, + IAM for both
./scripts/deploy.sh    # rebuild :latest with the new routes
```

Adding a GSI to a live, populated table is an **online backfill**: DynamoDB
builds the index in the background and the table stays readable throughout, but
the index returns partial results until the backfill finishes (seconds on a
small table). There is no seed and no data-migration script: the new user fields
land on each record the next time it is written, and the follow and love tables
start empty.

Deploying fresh? Follow step 03's staged bootstrap (registry, push, apply), then
the deploy. There is nothing extra to seed for social.

**Try it end to end:** open the **Discover** tab (the search icon in the right
pill). With an empty box it shows the most-followed people; type a name to
search. Tap someone to open their profile: their follower/following counts,
their wishlists, and the wishlists they've loved. Tap **Follow** and the label
flips instantly. Tap a follower count to walk the graph. Open one of their
wishlists and tap the **heart** to love it, and the tally moves with you. Open a
wishlist of your own and you'll see edit and delete where a stranger sees a heart.

## What's here

```
backend/
  app/routes/followers.py       + follow / unfollow (idempotent conditional
                                  writes) and the followers / following lists
  app/routes/loves.py           + love / unlove a wishlist, the per-viewer love
                                  status, and a user's loved-wishlists list
                                  (two routers, /wishlists and /users, like wishes)
  app/routes/users.py           + search (NameSearchIndex prefix), popular
                                  (PopularUsersIndex), the public profile
                                  GET /users/{id} with counts + is_following,
                                  and a user's public wishlists; PUT /me now
                                  keeps name_lowercase in sync on a rename
  app/routes/wishlists.py       GET /wishlists/{id} is now a public read;
                                  create seeds love_count = 0
  app/routes/wishes.py          the wishlist-scoped wishes listing is now public
  app/utils/user_access.py      + get_public_user: 404 for missing OR deleted,
                                  the read guard the follow graph and loves share
  app/utils/user_search.py      + name_lowercase: the search key derived in one
                                  place (provisioning AND a rename)
  app/utils/wishlist_access.py  + get_wishlist_or_404 (public read) beside
                                  get_owned_wishlist (owner-only write)
  app/utils/dynamo.py           + adjust_count (best-effort denormalized counter,
                                  floored at 0) and batch_get_items (the N+1 fix)
  app/utils/user_provisioning.py new users get entity_type, name_lowercase, and
                                  follower_count / following_count = 0
  app/models/{users,loves,wishlists}.py  UserWithCounts, LoveStatus, love_count
  app/main.py / database.py / config.py  the new routers, table handles, names
infra/
  dynamodb.tf                   + followers (FollowingIndex), wishlist-loves,
                                  and the two user GSIs with their attributes
  iam.tf                        + Query/BatchGetItem on users and its indexes,
                                  and least-privilege statements for both new tables
frontend/                       step 09's app plus:
  src/screens/DiscoverScreen.tsx      the Discover tab: debounced search + popular
  src/screens/UserProfileScreen.tsx   a public profile: counts, follow, wishlists, loved
  src/screens/FollowListScreen.tsx    followers/following, one screen for both
  src/components/FollowButton.tsx     the optimistic Follow / Following toggle
  src/components/LoveButton.tsx       the heart with its live tally
  src/components/Avatar.tsx           a circular avatar with an initial fallback
  src/components/UserRow.tsx          the shared person row (search + follow lists)
  src/components/WishlistGrid.tsx     the wishlist tile grid My Stuff and profiles share
  src/hooks/useOptimisticToggle.ts    the flip-count-revert both buttons run
  src/utils/{userName,pluralize}.ts   one spelling of a display name, one of a count
  src/screens/WishlistDetailScreen.tsx  owner sees edit/delete/add, a viewer a heart
  src/services/api.ts                 + the social contracts
  src/components/{Navigation,TabNavigation}.tsx  the profile/list screens + Discover mount
```

## The ideas this step plants

- **The edge is the truth, the count is a cache.** A follow is a row in the
  followers table; the follower/following numbers on a profile are denormalized
  copies kept by `adjust_count`. A conditional put makes the edge exist exactly
  once, so a double-tap follow moves the count once and a repeat is a no-op. The
  same shape drives loves. A lost increment leaves a count slightly low, never a
  wrong graph, so the counter write is best-effort and the decrement is floored
  at zero.
- **One partition, sorted two ways.** Every user carries a constant
  `entity_type = "USER"`. That single value is the partition key both user GSIs
  hash on, so "all users, by name" and "all users, by follower count" are each a
  single Query against one partition, never a Scan-and-sort. Search sorts on
  `name_lowercase` and prefix-matches; Discover sorts on `follower_count`
  descending.
- **Reading is open, writing stays owned.** Social makes every wishlist publicly
  viewable, so `get_wishlist_or_404` (404 only) now backs the reads while
  `get_owned_wishlist` (404 + 403) still guards every write. One screen serves
  both: it compares the wishlist's `created_by` to you and shows edit and delete
  or a love heart accordingly.
- **Extract on the second real caller, not before.** The follow and love buttons
  are the same optimistic flip-count-revert, so that behavior is one hook they
  both call. The wishlist tile grid became three callers the moment the profile
  existed (My Stuff, and a profile's two grids), so it is one `WishlistGrid`.
  Neither was built ahead of its second user.

## Gotchas

- **A new screen re-creates the grid next to it.** The profile's wishlist grid
  was a byte-for-byte clone of My Stuff's card map, and jscpd failed the gate on
  it. The fix wasn't to tweak one copy: the wishlist grid now has three real
  callers, so it is one `WishlistGrid` and both screens call it. The same round
  turned up three smaller twins the semantic reviewer caught: a hairline
  `marginTop` used in three places (now `Spacing.hairlineGap`), the love button's
  outlined pill already spelled by the life-event chip (now
  `CommonScreenStyles.outlinedPill`), and a "3 followers"/"3 products" label
  written twice (now a `pluralize` util). A screen modeled on an existing one is
  a duplication suspect before it is anything else, and each fix exposes the next.
- **A `/{user_id}` route will swallow `/search`.** FastAPI matches routes in
  declaration order, so the literal `/users/search` and `/users/popular` must be
  declared **before** the catch-all `/users/{user_id}`, or "search" is read as a
  user id and 404s. They live together in users.py in that order, below the
  `/me` routes for the same reason.
- **A rename that forgets the search key drops you out of search.**
  `name_lowercase` is what `NameSearchIndex` prefix-matches, so a profile name
  change has to move it in the *same* write, rebuilt from the incoming field plus
  the untouched one on the record. Derive it in one place (`user_search.py`) so
  provisioning and the rename can't spell it differently.
- **A friend's wish is display-only, not a dead tap.** A wishlist you view that
  isn't yours shows its wishes, but a single wish's detail (with its fulfilled
  toggle and edit/delete) stays owner-only. Rather than open a screen that would
  403, the wish tiles on someone else's wishlist render without an `onPress`:
  `ArtTileCard` and `WishCard` take an optional handler, pressable on your own
  wishlist and a plain display tile on theirs.
- **A public profile 404s a deleted account, never 403s it.** Your own guards
  403 a soft-deleted current user (you're real, your account is gone). Looking at
  someone else, a deleted account is simply not there, so `get_public_user`
  returns 404, and a deletion can't be probed by the status code the profile
  hands back.

## Done when

- [ ] Open **Discover**: an empty box shows popular people; typing a name
      searches, and each result opens that person's profile.
- [ ] On another user's profile, **Follow** flips to **Following** instantly and
      survives a screen refocus; tapping a follower/following count opens that
      list, and its rows open more profiles.
- [ ] Open one of their wishlists and tap the **heart**: it fills and the tally
      moves; it shows their wishes as display-only tiles, no edit or add.
- [ ] Open your own wishlist the same way: it shows edit, delete, and the add
      tile, and no heart.
- [ ] `curl $API/users/search?q=a` with a valid token returns matching users;
      `curl $API/users/popular` returns them ranked by follower count.
- [ ] `curl -X POST $API/users/<id>/follow` twice returns 204 both times and the
      target's follower_count rises by exactly one.

Next: `11-notifications`, an SQS to Lambda pipeline so a follow or a love finally
tells the person it happened.
```
