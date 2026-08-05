# Look, Don't Touch

*Zero to Shipped, step 10. Follow people, find them by name, and love the wishlists you like. Every profile and every wishlist is open for anyone to read, and locked to its owner for every change.*

![Zero to Shipped 10 hero: the Discover screen open with a wishlists-to-love rail and people to follow, beside a terminal where a name search returns Bella, any signed-in user reads someone else's wishlist with a 200, and a non-owner PUT to edit it is refused with a 403](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-10.png?v=PLACEHOLDER)

*Step 10 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

Nine steps in, the app is good at exactly one thing: keeping your own wishlists. You make them, you fill them, you look at them. Nobody else can. A wishlist with an audience of one is a notes app with a nicer tile grid. The whole point of a wish is that someone else reads it.

So this step makes the app social. You find a person by name, open their profile, follow them, and love the wishlists they built. The hard part is not drawing another screen. It is that every line of code so far assumed the only person who reads your data is you, and turning that around, carefully, touches four things at once.

- **Everything private has to become readable by strangers without becoming writable by them.** A wishlist's read check and its write check were one check: do you own it. Split it carelessly and you either 403 real viewers or hand them the edit routes.
- **Finding a person by name means searching every user, and a scan gets slower and dearer with every signup.** DynamoDB is fast when you query by key and slow when you rummage, and "everyone whose name starts with bel" is rummaging.
- **A follower count and a love count, counted live, are a query per profile view.** Cache the number on the record instead and it can drift, or race two taps and go negative.
- **A follow and a love are the same gesture, and the tap has to feel instant without lying.** Both flip a state and move a count. Build them as two buttons and they drift: one updates its number a beat late while the other does it right.

## What we build

A Discover tab. Search people by name, or browse two rails: most-loved wishlists and most-followed people. Tap a person and their public profile opens: follower and following counts, the wishlists they own, and the ones they have loved. Open one of their wishlists and you see every wish, with a heart to love the list. What you cannot do is change any of it.

One decision runs through all of it: everything you see of another person is open to read and closed to write. The same wishlist is a public page to any viewer and editable only by its owner, so a stranger can open it, love it, and copy nothing but the idea.

- **Reading and writing split into two guards.** One helper fetches a record for anyone signed in; the other fetches it and refuses anyone who is not its owner. Every route picks the one it needs.
- **Search and the popular rails read a sorted index, never a scan.** Every user carries a constant tag, `entity_type = "USER"`, every wishlist `"WISHLIST"`; that one shared value lets a secondary index gather the whole table under a single key and hand it back sorted. One index per order: name for the typeahead, follower count for Discover, love count for the rail.
- **The counts live on the record, nudged by the edge writes.** A follow writes one row and bumps two counters; the counters are a cache the profile reads in one shot, floored so a double-unfollow can never push one below zero, and best-effort so a lost bump never blocks the follow that already happened.
- **Follow and love share one optimistic hook.** Tap either and the boolean and its count flip on the spot, the request fires, and if it fails both roll back with a toast. The follow button and the love heart are just their own icon over that one shared dance.

Two things this step deliberately is not. Not notifications: following someone tells them nothing yet, and the pipeline that turns a new follower into a ping is step 11. And not privacy or sharing: every wishlist is public to every signed-in user, with no private toggle and no co-owners. Sharing a list between people, and hiding one, are both step 14.

**What we need:** step 9 complete, an AWS account, and the step-3 deploy in place. This step adds two DynamoDB tables and four indexes, so it wants a real backend: a deployed stack, or a local one with the tables applied. No new accounts, no new secrets; the social layer is all your own data.

**Time:** about 60 to 90 minutes, most of it the deploy and then creating a second account so you have someone to follow.

**The code:** the snippets below are shown as images; the full, copyable source is [the step folder on `main`](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/10-social), organized by the file paths in each caption. The build's whole story is [PR #74](https://github.com/srivardhanjalan/kivan-tutorial/pull/74/files), stacked on the baseline copy in [PR #73](https://github.com/srivardhanjalan/kivan-tutorial/pull/73/files).

## What we touch this step

Around two dozen files carry the feature, most of them new screens and components, wired into the routes and infra around them.

![What we touch this step, the new files grouped by folder and the existing ones they wire into: the backend followers and loves routes with the shared access guards and the denormalized-count and batch-get helpers, the users route gaining name search and public profiles, the frontend Discover and profile and follow-list screens with the shared optimistic-toggle hook and the follow, love, avatar and user-row components, and the infra two edge tables with the search and popularity indexes and the grants to match; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-filemap.png?v=PLACEHOLDER)

## Open the read, lock the write

Get this wrong and one of two things ships: a profile that 403s every visitor, or an edit button that works on a stranger's wishlist. Both come from the same shortcut.

Until this step a wishlist had one gate. `get_owned_wishlist` fetched the record and, in the same breath, checked that the caller created it, because the only reader was ever the owner. The tempting way to add public profiles is to loosen that gate: drop the ownership check so anyone can read. But editing and deleting funnel through the same function, so you have just dropped the check that protected the write along with the one that blocked the read.

So the gate splits in two. `get_wishlist_or_404` reads: fetch the record, 404 if it is missing, hand it to any signed-in user. `get_owned_wishlist` writes: call the reader first, then add the ownership check on top, 403ing anyone who is not the creator. A route declares which it wants by which helper it calls. A wish inherits its wishlist's rule, because a wish's write access has always been its wishlist's ownership.

[![wishlist_access.py: get_wishlist_or_404 reads for anyone, get_owned_wishlist layers the single-owner check on top for a write](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-access.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/backend/app/utils/wishlist_access.py)

![The two gates on one wishlist: a read fetches the record and returns it to any signed-in viewer, while a write fetches the same record and then refuses anyone who is not the owner, so the same wishlist is a public page to read and an editable one only to its creator](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-access.png?v=PLACEHOLDER)

The screen enforces the same split, so it never offers a control it would be refused. On your own wishlist the header carries edit and delete and a New Wish tile leads the grid; on someone else's, all of that is gone and a love heart takes the header's place. The tiles change too, on one prop of the shared tile: hand it an `onPress` and it renders a pressable that taps through to the wish, omit it and it renders a plain view. One component, pressable or not.

[![ArtTileCard.tsx: one tile renders a pressable when handed an onPress and a plain view without one, so a wish is tappable on your own wishlist and display-only on someone else's](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-tile.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/frontend/src/components/ArtTileCard.tsx)

The record is readable and safe. Now the app has to find the person whose record it is.

## Search a table DynamoDB will not sort

Type three letters into Discover and you expect the people whose names start with them, fast, while more letters are still coming. The naive version scans the users table and filters the names in memory. It works on the ten users you seeded and falls over on ten thousand: a scan reads every row, and bills you for every row, on every keystroke.

DynamoDB is built to query, not scan, but a query needs a partition key to point at, and "all users" has none. The fix is almost too simple: give every user the same one. Each record carries a constant `entity_type = "USER"`, and a secondary index hashes on it, so every user lives under one partition and querying that key returns the whole table, sorted by the index's range key. Range by `name_lowercase` and a prefix query, `entity_type = "USER" AND name_lowercase begins_with "bel"`, is the typeahead. Range a second index by `follower_count`, read descending, and it is Discover's most-followed rail.

[![dynamodb.tf: every user carries a constant entity_type, and two GSIs hash on it, one ranged by name_lowercase for prefix search and one by follower_count for the popular rail](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-index.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/infra/dynamodb.tf)

The search route is then a single query, capped and prefix-matched, never a scan. An empty box returns nothing and the screen shows the rails instead, so a blank query never turns into "read everyone".

[![users.py: search is a prefix query on NameSearchIndex, all users under the USER partition and name_lowercase the sort key, capped and never a Scan](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-search.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/backend/app/routes/users.py)

![The constant-partition pattern: every user record is stamped entity_type USER, so that one shared tag gathers them all under one partition, and two indexes keep them sorted by their range keys, turning all users, in name order into one prefix query and all users, most followed first into one descending query](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-index.png?v=PLACEHOLDER)

One honest caveat: a single constant partition is a hot partition, and at very large scale you would spread the tag across a handful of shards. At this app's scale the index is small and the read is cheap, so we keep the one partition and note where it would bend. The wishlist rail rides the identical pattern, `entity_type = "WISHLIST"` ranked by `love_count`, so Discover's two rails and its search are one idea used three times.

There is a sharp edge hiding in `name_lowercase` that a real signup found the hard way; it waits for the scars at the end. For now the search is fast. Next the app needs edges to search across: who follows whom.

## Follow once, count forever

A follow is one row: who followed whom. Showing "42 followers" by counting 42 rows on every profile load is a query that grows with popularity, exactly backwards. So the number lives on the user record, a cache the profile reads in one shot, and the follow write nudges it.

Two traps sit in that nudge, and the naive version hits both. Increment blindly and a double-tapped follow counts twice off one real edge. Decrement blindly and a race between two unfollows drives the tally to minus one. Both are fixed at the edge, not the count. The follow is a conditional write: the row is written only if it does not already exist, so a repeat follow fails the condition and returns a quiet success that touches no counter. The unfollow mirrors it, deleting only an edge that is there. The count moves exactly once per real change, because the edge changed exactly once.

[![followers.py: follow and unfollow are conditional writes, so the edge exists exactly once and the denormalized counts move only when it truly changes](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-follow.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/backend/app/routes/followers.py)

The nudge itself is one shared helper, deliberately forgiving. An increment seeds the field from zero if the record predates the counter, so an old user with no attribute still counts up. A decrement carries a condition that it stay at or above zero, so the floor is enforced by the database, not hoped for. And it swallows its own failure: the edge is the truth, the count is a cache, and a lost bump leaves a number one low, never a follow half-done. A cache is allowed to be slightly wrong; the edge is not.

[![dynamo.py: adjust_count seeds from zero on the first increment, floors a decrement at zero with a condition, and swallows failure because the count is a cache, not the source of truth](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-count.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/backend/app/utils/dynamo.py)

Reading the graph back is two queries off the one table. "Who this user follows" is a query on the base table, where the follower is the partition key. "Who follows this user" flips the edge through a second index that makes the followed user the partition key, so both directions are a single query and neither is a scan.

![The follow edge and its counts: a tap writes one row only if it is new, then nudges the followed user's follower count and the caller's following count, while a second index flips the edge so who follows X is a query too, and the two counts on the records are the cache the profile reads in one shot](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-follow.png?v=PLACEHOLDER)

The graph is written and readable. Now the tap that writes it has to feel like nothing.

## One gesture, two buttons

A follow and a love are the same small dance. Flip a boolean, move a count, send the request, and if the network says no, put both back and say so. Written twice, once in the follow button and once in the love heart, they drift, and the follow count drifted first (the scars below have the whole story). Written once, they cannot.

The dance lives in one hook, `useOptimisticToggle`. It holds the on/off state and the count; its `toggle` flips both instantly, fires the request, and rolls both back with a toast if the request throws. It is seeded once from the values it reflects, so a control mounts it only after those are known: the love heart after the wishlist's love count loads, the follow button after the profile's follower count.

[![useOptimisticToggle.ts: one hook flips a boolean and its count on tap, fires the request, and rolls both back with a toast on failure, so the follow button and love heart share one optimistic behaviour](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-toggle.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/frontend/src/hooks/useOptimisticToggle.ts)

The love heart is the clean case: heart and tally sit together, so one component mounts the hook and renders both. The follow button is the case that taught the lesson. The count is a stat up in the profile header, the button below it, so for the tally to move with the tap the hook has to live where both do: it lifts up into the header. The header seeds one toggle from the follower count and passes the state down, and the button becomes purely presentational, a pill that renders "Follow" or "Following" and calls up when tapped. One tap, one hook, and the number and the label move together.

![Following a real person: the profile opens with a red Follow pill and no follower yet, and one tap turns it into a grey Following pill with the follower count moved to one, the button and the tally driven by the same optimistic toggle](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-fig-follow.png?v=PLACEHOLDER)

Love is the same hook on someone else's wishlist. The heart shows the current count; tap it and the fill and the tally move together, optimistically, rolling back if the love does not land. The count is denormalized on the wishlist the same way the follower count is on the user, so the number the heart shows is the one that ranks the popular rail.

![Loving someone else's wishlist: the display-only wishlist shows an empty heart reading zero, and one tap fills the heart and moves the count to one, while the wishes below stay view-only with no add tile and no edit controls](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-fig-love.png?v=PLACEHOLDER)

The buttons work. The last thing to build is the screen that sends you looking for people to press them on.

## Build the Discover feed

Discover has two moods. With an empty search box it is a directory: a rail of the most-loved wishlists, then a list of the most-followed people, both read from those constant-partition indexes in descending order. Start typing and it becomes a search: a debounced name query that fires once after you pause, not once per keystroke, so three fast letters are one request, not three.

[![DiscoverScreen.tsx: an empty box shows the popular rails, typing runs a debounced name search, people rows open a profile and wishlist tiles open the list](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-discover.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/frontend/src/screens/DiscoverScreen.tsx)

The most-loved wishlists come off `GET /wishlists/popular`, a query on the popularity index in descending love order, capped to a short preview because a rail is a glance, not a page. Both popular routes sit above the catch-all `GET /{id}` on purpose, so `/popular` is never mistaken for a wishlist whose id happens to be "popular".

[![wishlists.py: the wishlists-to-love rail is one descending query on the popularity index, capped to a short preview, declared above the catch-all id route](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-popular.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/10-social/backend/app/routes/wishlists.py)

The wishlist tiles reuse the exact rail Home draws for your own newest lists. That row of cards lived inline in Home until Discover wanted it too, so it moved into one `WishlistRail` both screens call. The rows and grids follow suit: a person is one shared `UserRow` in search, in a follow list, or on the popular rail, and a profile's Wishlists and Loved sections are one grid it shares with My Stuff. Nothing about a person or a list is drawn twice.

![Discover, both moods: an empty box shows the wishlists-to-love rail and the people-to-follow list, and typing a name runs a debounced search that returns the matching person as a tappable row](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-fig-discover.png?v=PLACEHOLDER)

## Deploy it

This step adds two DynamoDB tables, `followers` and `wishlist-loves`, the four indexes the search and Discover screens query, and the grants to match. No S3, no SSM, no new secret: the social graph is all first-party data. Deploy on a stack that is already up, then rebuild the image so the new routes are live.

[![The two deploy commands: terraform apply to add the follower and love tables and their indexes, then the image rebuild that ships the social routes](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-10-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/10-social/infra)

There is nothing to seed: the tables start empty and fill as people follow and love. The one thing worth doing before you call it working is creating a second account, from a different email, so you have someone real to search for, follow, and whose wishlist you can love. And if a fresh `terraform apply` dies with a bare `CREATE_FAILED` and no logs, run it again: App Runner's service creation is intermittently flaky, and a plain retry brings it up on identical config.

## What bit me

Three things cost me time here, unevenly. Two were caught by the gate and a real device before anything shipped. The first waited for a real signup on a real stack and then broke the app's front door, and it is the one worth reading twice.

**Every email-and-password signup provisioned into a 500, and only a live account showed it.** The name search index keys on `name_lowercase`. In-app email signup collects no name, so provisioning wrote `name_lowercase = ""`, and DynamoDB rejected the whole write: an index key attribute cannot be an empty string. The record never got created, so `GET /users/me` 500ed, and it 500ed forever, because the retry path, `PUT /users/me`, wrote the same empty string again. The account was wedged from inside the app with no way out. It survived every static check and three clean review passes for a quiet reason: until then every user arrived with a name. Seed data had names, and the Google and Apple sign-ins carry one from the provider, so the only path that makes a nameless user, plain email signup, was the one no test user had taken. It took a real account on a real stack to walk into it. The fix is the sparse-index idiom: a row with no value for the key attribute simply is not in the index, exactly right here, since a nameless person should not be findable by name until they have one. So both writers stop writing the empty string: provisioning omits `name_lowercase` when the name is blank, and a profile edit that clears a name uses `REMOVE` rather than `SET` it to `""`. I re-ran all three cases live: a nameless signup provisions with a 200 and is absent from search, setting a name adds them, clearing it drops them out. The lesson landed hard: a static gate proves the code is clean, not that it survives a real user, and the cheapest real user is the one you skipped because they looked like an edge case.

**The follow count updated a beat late while the love count did it right.** I built the follow button with its own local state, the way you would sketch it first. Tapping Follow flipped the pill instantly, but the follower stat in the header above sat unchanged until the screen refetched, lagging the button by a visible beat. The love heart moved its tally on the tap, because there the count and the control were one component. Two interactions doing one job two ways, and the worse way was the one I wrote second. The fix was to stop having two: the follower tally and the follow button now share one `useOptimisticToggle`, the instance the love heart already used, lifted into the profile header so it drives both. There was a sting in the tail. Once the follow button used the hook's count, the gate flagged that `initialCount` had been optional all along, with a default of zero and a docstring calling it optional, a quiet lie papering over the one caller that never passed a count. Making both callers pass it let the option, the default, and the false comment all go. A shared mechanism does not just remove duplication; it removes the little untruths each copy was allowed to keep.

**The baseline copy carried two of the last step's untrue comments in with it.** Step 10 starts as a byte-for-byte copy of step 9, which keeps each step's real delta legible. It also inherits any comment step 9 had not yet corrected, and two rode along: a seed comment naming Nike as a store with its own dedicated scraper when the four bespoke scrapers are Zara, Nykaa, Puma, and Apple, and a component doc citing "the add tile's plus" as an overlay it does not pass. Neither is a crash; both are comments that lie, which the codebase treats as a defect in its own right, because a comment you cannot trust is worse than none. The review caught them and I applied step 9's corrections verbatim. It is the tax on the baseline-copy workflow: a clean copy is only as honest as the thing it copied, so the first pass on a fresh step re-reads the comments it did not write.

## You're done when

- [ ] The tab bar has a **Discover** tab; opening it with an empty search box shows a **Wishlists to love** rail and a **People to follow** list.
- [ ] Typing a name into Discover returns the matching people as tappable rows; an empty box shows the rails again.
- [ ] Tapping a person opens their profile with follower and following counts, their wishlists, and the wishlists they have loved.
- [ ] Tapping **Follow** flips the pill to **Following** and the follower count moves up in the same tap; tapping again unfollows and moves it back.
- [ ] Opening someone else's wishlist shows a love heart and no edit controls; the wishes are visible but not tappable, and there is no New Wish tile.
- [ ] Tapping the heart fills it and moves the love count in the same tap; the same wishlist can then appear on the popular rail.
- [ ] A brand-new email-and-password signup lands in the app without a 500, and shows up in search only after setting a name in Settings.
- [ ] `curl $API/users/search?q=...` with no token returns 401; with a token it returns matching users. A `PUT` to a wishlist you do not own returns 403, while a `GET` of it returns 200.

## What's next

Step 11, Notifications: an SQS to Lambda pipeline that turns a new follower or a love into an in-app notification, so the social activity this step created finally reaches the person it is about.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · [Signed, Sealed, Delivered](https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392)**
- **05 · [Two Places at Once](https://medium.com/@srivardhanjalan/two-places-at-once-1e00bb46354b)**
- **06 · [Photos Without the Exposure](https://medium.com/@srivardhanjalan/photos-without-the-exposure-96e9acf11db3)**
- **07 · [Whose Wish Is It Anyway?](https://medium.com/@srivardhanjalan/PLACEHOLDER-07-URL)**
- **08 · [Off the Shelf](https://medium.com/@srivardhanjalan/PLACEHOLDER-08-URL)**
- **09 · [The Price Is Right](https://medium.com/@srivardhanjalan/PLACEHOLDER-09-URL)**
- **10 · Look, Don't Touch** (you are here)
- **11 · Notifications** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
