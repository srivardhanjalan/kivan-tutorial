# Whose Wish Is It Anyway?

*Zero to Shipped, step 7. Wishlists and wishes that belong to one person: a single gate judges every read and write, and deleting a wishlist takes its wishes and their photos with it.*

![Zero to Shipped 07 hero: the My Stuff screen, a grid of wishlists in per-occasion pastels, beside a terminal where one access gate answers 401 with no token, 403 on another account's wishlist, and 404 on a made-up id](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-07.png?v=PLACEHOLDER)

*Step 07 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

The app finally becomes the thing it exists for: wishlists that hold wishes, each wishlist filed under an occasion. Drawing the grid is the easy part. The moment a wishlist belongs to someone, four problems show up at once:

- **A wish has no owner of its own.** It lives inside a wishlist, so "who may read or edit this wish?" is a question every wish route has to answer.
- **Access re-derived is access that drifts.** Check "is this yours?" in a handful of handlers and, sooner or later, one of them gets it subtly wrong.
- **Delete can leave a trail.** Remove a wishlist but not its wishes and their photos, and you are left with orphaned rows and files nobody can reach.
- **Two more things now hold photos.** Wishlists and wishes each carry an image, which tempts you into a second, weaker copy of step 6's upload flow.

One thing this step deliberately skips: sharing a wishlist between people. Every list has one owner today; co-ownership is its own feature, in step 14. Single-owner is what keeps this step's rule small.

## What we build

One decision answers all four: a wishlist has exactly one owner, and a wish's access is simply its wishlist's access, decided in one function. That splits into six moves, in order: the one access gate, wishlists owned end to end, wishes routed through that same gate, the seeded list of occasions, the cascade that makes delete mean delete, and step 6's photo flow reused with its shared helper hardened.

**What we need:** step 6 complete, an AWS account, and the step-3 deploy in place. This step reads three DynamoDB tables, so like step 6 it wants a real backend: a deployed stack, or a local one with the occasions seeded.

**Time:** about 60 to 90 minutes.

**The code:** the snippets below are images; the full, copyable source lives in [PR #60: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/60/files), organized by the file paths in each caption.

## What we touch this step

Three layers carry the work: the backend that owns access and the data, the app's collection screens, and the infra that adds three tables. Each section below takes one.

![What we touch this step: the backend routes, the ownership gate, and shared DynamoDB helpers; three models and the app assembly; the frontend collection screens, the shared art tile, and the occasion picker; the infra with three DynamoDB tables, per-table IAM, and the seeder. Each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-filemap.png?v=PLACEHOLDER)

## Judge access once, in one place

Get this wrong and someone opens a wishlist that isn't theirs, or six routes each grow their own slightly different idea of "yours." So the decision lives in exactly one function, and every route reads through it.

A wishlist has a single owner: the account in `created_by`. The gate loads the row, compares that one field to the caller, and returns one of three things: the wishlist, a 403, or a 404.

[![The one ownership gate: load the wishlist, then 404 if it is missing, 403 if it is not the caller's](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-gate.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/wishlist_access.py)

The load half earns its own helper. `get_item_or_404` turns a missing row into a 404, and an impossible id too: an empty or oversized key makes DynamoDB raise a validation error that would otherwise become a 500. Guard it once, and every gate above inherits a clean 404.

![Reading a wish: the app asks the backend, the backend loads the wish and then its wishlist, and the one gate checks the wishlist's owner before anything comes back](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-gate.png?v=PLACEHOLDER)

## Wishlists, owned end to end

Your list of wishlists has to be yours, and cheap to fetch. Filtering the whole table in Python is slower and a leak waiting to be forgotten. So ownership is read straight off an index instead.

`GET /wishlists/me` is a query on `CreatedByIndex`, keyed by `created_by`. It never scans the whole table.

[![GET /wishlists/me: a query on CreatedByIndex, sorted newest-first in the handler, plus the single-wishlist route calling the gate](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-wishlists.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/routes/wishlists.py)

Two things the query can't do for us live in the handler. It returns rows in no useful order, so "newest first" is a plain sort after the read (ISO timestamps sort the same way as time). And one page caps at 1 MB and hands back a marker for the rest; read only the first page and a big list loses its tail, so both list endpoints follow that marker to the end.

## A wish's access is its wishlist's

A wish has no owner field of its own. Work out its access from scratch and you have written a second rulebook that can disagree with the first. So a wish never gets its own rule.

`_get_owned_wish` loads the wish, reads its `wishlist_id`, and hands straight off to the same `get_owned_wishlist` gate the wishlist routes use.

[![Every wish route funnels through _get_owned_wish, which loads the wish then defers to its wishlist's owner gate; the got-it toggle flips one field through the guarded write](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-wishes.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/routes/wishes.py)

Every wish route goes through it: read, update, delete, the wishlist's wish listing, and the got-it toggle. That toggle looks trivial and is the one most likely to corrupt its neighbor. Marking a wish fulfilled changes a single field, but reading the whole row and writing it back would overwrite a name edit that raced it, from a stale copy. So every update writes only the fields that changed:

[![update_item_fields: a field-scoped write with a condition, so a row deleted mid-write comes back as a 404 instead of a resurrected phantom](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-guarded.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/dynamo.py)

It sets only the changed columns, with a condition so a row deleted mid-write comes back as a 404, not a resurrected phantom. The currency symbol is one shared constant, so switching currency later is a one-line change.

## Nine occasions, seeded not shipped

Hard-code the occasions in Python and every new one is a redeploy; worse, the running app could rewrite them. So the list lives in its own table, filled by a small script, not baked into the code.

[![The nine seeded occasions, birthday through general, each with an id, a name, an emoji, and a display order](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-seed.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/infra/scripts/seed_life_events.py)

`general` is the fallback every wishlist can land on, so it must always exist. `GET /life-events` reads the nine rows and orders them for display. The running app can only read this table; writing the reference data is a developer's job, which the permissions below enforce.

## Delete means delete

Remove a wishlist but leave its wishes and their photos, and you have made orphans nothing will ever clean up. So one function tears the whole tree down.

[![delete_wishlist_and_contents: read the wishes off WishlistIdIndex, delete every uploaded photo, remove the wish rows, then remove the wishlist](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-cascade.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/wishlist_access.py)

It reads the wishlist's wishes, deletes every photo they uploaded, removes the wish rows, then removes the wishlist itself.

![Deleting a wishlist: one cascade in the backend removes the wishlist and its wish rows from DynamoDB and deletes every uploaded photo from S3, so nothing is orphaned](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-cascade.png?v=PLACEHOLDER)

Order is the load-bearing detail: photos first, rows second. If the teardown is interrupted (a crash, a restart), what's left is always something a retry can finish, because a surviving row still points at its photo. Do it the other way and a deleted row's photo is stranded, with nothing left to name it. And the cascade has two callers, not one: deleting your account runs this exact path over every wishlist you own, so there is a single teardown with no second copy to keep in sync.

## Two more photos, one hardened path

Wishlists and wishes both carry an image now, and the lazy move is a fresh upload path for each. That is how you end up with three subtly different flows. So there is no new flow: a wishlist photo and a wish photo are just two more kinds on step 6's existing upload machinery. The whole change to the upload endpoint is two new entries in a list of allowed kinds:

[![The upload endpoint's list of allowed kinds gains wishlist_photo and wish_photo alongside the profile and cover kinds](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-kinds.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/routes/upload.py)

Sharing that machinery is what forced it to grow up. In step 6 it compared photos by storage key, not by the signed URL, and that was enough while only the profile stored images. The moment a third caller reused it, the shape it trusted stopped being proof:

[![plan_photo_update, hardened: reject a permanent or someone-else's key, reject a pending key whose stamped owner isn't the caller, and confirm the file exists before claiming it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-teeth.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/s3_helpers.py)

Now that three routes store photos, the shared helper rejects a pending photo whose stamped owner isn't the caller, and confirms the file actually exists before it claims it. So a replayed or hand-forged key can't quietly point two records at one file. The key-based compare from step 6 stays underneath: a signed URL echoed back still resolves to the stored file, so an unchanged save is a clean no-op instead of a self-delete.

## Deploy it

This step adds infrastructure: three DynamoDB tables (`wishlists` and `wishes`, each with an index, and the index-free `life-events`), plus one least-privilege grant per table on the running role. Deploy on a stack that is already up:

[![Three deploy commands: terraform apply for the tables and IAM, the deploy script to rebuild the image, then the one-time life-events seed](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/07-collections/infra)

The seed is not optional. Skip it and `GET /life-events` returns an empty list, and the create-wishlist screen has no occasions to offer. It updates by id, so running it again is harmless; run it once after every fresh apply.

The permissions split is worth a look. Each table gets exactly the actions its routes use, and `life-events` gets the tightest set:

[![The life-events IAM statement: the running role is granted read on that table and nothing else, so it can read the reference data but never write it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-iam.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/infra/iam.tf)

The running app can read the reference data and nothing more. Seeding it is a developer job, so the app can't add or overwrite an occasion even if a bug told it to. (A carryover from step 6: a fresh `terraform apply` can die with a bare `CREATE_FAILED` and no logs. Nothing is wrong in config; apply again and it comes up. Retry, don't hunt.)

## What bit me

Three things cost me time on this step, worst first:

**A price blew up the write.** The first wish I saved with a cost 500'd: `Float types are not supported. Use Decimal types instead.` DynamoDB rejects Python floats outright, so `cost` now stores as a `Decimal` and comes back a float on read. Two bounds ride along on the model so a weird value gets a clean 422 instead of a 500 deeper down: reject `Infinity` and `NaN` (which JSON otherwise waves through), and cap the size well under DynamoDB's limit.

**A wishlist list in nonsense order.** `GET /wishlists/me` came back shuffled. The index I query has no sort key, so it returns rows in no defined order, and "newest first" simply wasn't true. DynamoDB won't sort it for me, so the handler sorts in Python after the read. ISO timestamps sort the same as time, so it is a plain reversed string sort, not date parsing.

**A shared photo helper that trusted the shape.** Step 6's key-based compare was enough while only the profile stored images. The moment wishlists and wishes reused the same helper, I could see the shape it trusted wasn't proof: a pending key parses fine even if another user uploaded it, or if it was already claimed and its URL got replayed. So the shared version grew teeth, an owner check and an existence check, before it promotes anything. Extracting the function didn't just move it; sharing it is what exposed what it had been assuming.

## You're done when

- [ ] Creating a wishlist under an occasion shows it in My Stuff, newest first, the moment you return.
- [ ] Adding a wish with a name, cost, link, and photo, then opening it, shows the cost with its currency symbol and loads the photo.
- [ ] Marking a wish fulfilled flips the state with no reload, and it is still fulfilled when you reopen it.
- [ ] `curl $API/wishlists/me` with no token returns 401; `GET /wishlists/{id}` on another account's wishlist returns 403; a made-up id returns 404. (Run this before deleting your account below: after that, no new token can be minted.)
- [ ] Deleting a wishlist takes its wishes and their photos with it: no orphan rows, no orphan files.
- [ ] Deleting your account sweeps every wishlist you owned along with it.

## What's next

Step 8, Storefronts: curated stores with products, so a wish can come from a catalog instead of the hand-typed form we built here.

---

**Zero to Shipped: the series**

- **00 · [Introduction](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9)**
- **01 · [One script to set up everything](https://medium.com/@srivardhanjalan/one-script-to-set-up-everything-ae8bcea2d649)**
- **02 · [Dressed to Ship](https://medium.com/@srivardhanjalan/dressed-to-ship-1e2591179d8a)**
- **03 · [Alive on Arrival](https://medium.com/@srivardhanjalan/alive-on-arrival-cda0a351844f)**
- **04 · [Signed, Sealed, Delivered](https://medium.com/@srivardhanjalan/signed-sealed-delivered-a481a02ac392)**
- **05 · [Two Places at Once](https://medium.com/@srivardhanjalan/two-places-at-once-1e00bb46354b)**
- **06 · [Photos Without the Exposure](https://medium.com/@srivardhanjalan/photos-without-the-exposure-96e9acf11db3)**
- **07 · Whose Wish Is It Anyway?** (you are here)
- **08 · Storefronts** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
