# Whose Wish Is It Anyway?

*Zero to Shipped, step 7. Wishlists and wishes that belong to one person: a single gate judges every read and write, and deleting a wishlist takes its wishes and their photos with it.*

![Zero to Shipped 07 hero: the My Stuff screen showing a grid of wishlists washed in per-occasion pastels beside a terminal where one access gate answers 401 with no token, 403 on another account's wishlist, and 404 on a made-up id](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-07.png?v=PLACEHOLDER)

*Step 07 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

The app finally becomes the thing it exists for: wishlists that hold wishes, each wishlist filed under an occasion. Drawing the grid is the easy part. Storing collections that belong to someone is four problems at once:

- **A wish has no owner of its own.** It lives inside a wishlist, so deciding who may read or edit it is a question every wish route has to answer.
- **Access re-derived is access that drifts.** Recompute "is this yours?" in a handful of handlers and one of them will get it subtly wrong.
- **Delete can leave a trail.** Drop a wishlist, and its wishes, and every photo they uploaded can outlive it as orphaned rows and unreachable bytes.
- **Two more record types now hold photos.** Wishlists and wishes each carry an image, which tempts a second, weaker copy of step 6's upload lifecycle.

## What we build

One decision answers all four: a wishlist has exactly one owner, and a wish's access IS its wishlist's access, judged in exactly one function. That splits into six moves, built in this order: the one access gate, wishlists owned end to end, wishes funneled through that same gate, the seeded occasion taxonomy, the cascade that makes delete mean delete, and step 6's photo lifecycle reused with its planner grown teeth.

**What we need:** step 6 complete, an AWS account, and the step-3 deploy in place. Collections read three DynamoDB tables, so like step 6 this step wants a real backend: a deployed stack, or a locally-applied one with the taxonomy seeded.

**Time:** about 60 to 90 minutes.

**The code:** the snippets below are images; the full, copyable source lives in [PR #60: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/60/files), organized by the file paths in each caption.

## What we touch this step

The work spans three layers: the backend that owns access and the data, the app's collection screens, and the infra that adds three tables. Each build section takes one area.

![What we touch this step: the backend routes, the ownership gate and shared DynamoDB helpers, three models, and the app assembly; the frontend collection screens, the shared art tile, the occasion picker and pastels; and the infra with three DynamoDB tables, per-table IAM, and the seeder. Each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-filemap.png?v=PLACEHOLDER)

## Judge access once, in one place

Get this wrong and someone opens a wishlist that isn't theirs, or a half-dozen routes each grow their own slightly different idea of "yours." So access is decided in exactly one function, and everything reads through it.

A wishlist has a single owner: the account in `created_by`. Co-owners are a deliberate step-14 problem, and staying single-owner today is precisely what lets the rule be this small. The gate fetches the row, compares one field, and returns one of three things: the wishlist, a 403, or a 404.

[![The one ownership gate: fetch the wishlist, then 404 if missing, 403 if not the caller's](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-gate.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/wishlist_access.py)

The fetch half earns its own helper. `get_item_or_404` turns a missing row into a 404, and it also turns an impossible id into one: an empty or over-2048-byte partition key makes DynamoDB throw a ValidationException, which would otherwise surface as a 500 for an id that could never exist. Guard that once, structurally, and every gate above it inherits a clean 404.

![Read a wish: the app asks the backend, the backend gets the wish and then its wishlist, and the one gate checks that the wishlist's created_by is the caller before anything is returned](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-gate.png?v=PLACEHOLDER)

## Wishlists, owned end to end

The list has to be your wishlists, and cheaply. Filtering a full-table Scan by owner in Python is slower and a leak you have to remember to write. So ownership is read straight off an index instead.

`GET /wishlists/me` is a Query on `CreatedByIndex`, keyed by `created_by`, never a Scan of the whole table:

[![GET /wishlists/me: a Query on CreatedByIndex, sorted newest-first in the handler, plus the single-wishlist route calling the gate](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-wishlists.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/routes/wishlists.py)

Two things the Query can't do for us, and both live in the handler. A hash-only GSI returns items in no useful order, so newest-first is a Python sort after the read (ISO timestamps sort lexically the same way they sort in time). And a single Query page caps at 1 MB and hands back a `LastEvaluatedKey`; read only that first page and a large collection quietly loses its tail, so both list endpoints go through a `query_all_pages` helper that follows the key to the end. Create, update, and delete each open with the same gate call, so ownership is settled before a byte moves.

## A wish's access is its wishlist's

A wish carries no owner field of its own. Re-derive its access from scratch and you've written a second rulebook that can disagree with the first. So a wish never gets its own access rule.

`_get_owned_wish` fetches the wish, reads its `wishlist_id`, and hands straight off to the same `get_owned_wishlist` gate the wishlist routes use:

[![Every wish route funnels through _get_owned_wish, which reads the wish then defers to the wishlist's owner gate; the complete toggle flips one field through the guarded write](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-wishes.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/routes/wishes.py)

Every wish route runs through it: read, update, delete, the wishlist-scoped listing, and the got-it toggle. That toggle looks trivial and is the one most likely to corrupt its neighbor. Marking a wish fulfilled changes a single field, but a read-modify-write would rewrite the whole row from a possibly-stale read, silently reverting a name edit that raced it. So every update funnels through one field-scoped write:

[![update_item_fields: a field-scoped SET with aliased names and a condition so a deleted row surfaces as a 404, not a resurrected phantom](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-guarded.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/dynamo.py)

It SETs only the columns that actually changed, aliases every attribute name (`name` is a reserved word in DynamoDB), and carries a condition so a row deleted out from under the write comes back as the same 404 the gate would have given, never as an upserted phantom. A wish's `cost` rides along as a plain number, and the currency symbol is a single `AppConfig` constant every price reads, so a per-user currency later is a one-line swap rather than a hunt.

## Nine occasions, seeded not shipped

Hard-code the occasions in Python and every new one is a redeploy. Worse, the running service could rewrite them. So the taxonomy lives in its own table, populated by an idempotent script, not baked into the app.

[![The nine seeded occasions: birthday through general, each with an id, name, emoji, and display order](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-seed.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/infra/scripts/seed_life_events.py)

`general` is the catch-all a wishlist falls back to, so it must always exist. `GET /life-events` is an auth-gated Scan (nine reference rows never graze the 1 MB cap), ordered by `display_order` in the handler. The model ignores extra item fields, so a later step can widen the seed without touching Python. And the running role can only read this table: writing reference data is a developer's job, not the service's, which the IAM split below enforces exactly.

## Delete means delete

Drop a wishlist and leave its wishes and their photos behind, and you've minted orphans nothing will ever collect. So one function tears the whole tree down.

[![delete_wishlist_and_contents: read the wishes off WishlistIdIndex, delete every uploaded photo, batch the wish rows away, then drop the wishlist](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-cascade.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/wishlist_access.py)

It reads the wishlist's wishes off `WishlistIdIndex`, deletes every photo any of them uploaded, batches the wish rows away, then drops the wishlist itself.

![Delete a wishlist: one cascade in the backend drops the wishlist and its wish rows from DynamoDB and deletes every uploaded photo from S3, so nothing is orphaned](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-cascade.png?v=PLACEHOLDER)

Order is the load-bearing detail: photos first, rows after. An interrupted teardown (a crash, an instance recycle) then leaves only states a retry can finish, because a surviving row still points at its photo. Reverse it and every already-deleted row's photo is stranded with nothing left to name it. And the cascade has two callers, not one: deleting your account reuses this exact path over every wishlist you owned, so there is a single teardown with no second, drifting copy to keep in sync.

## Two more photos, one hardened path

Wishlists and wishes both carry an image now, and the lazy move is a fresh upload path for each. That is how you end up with three subtly different lifecycles. So there is no new lifecycle: a wishlist photo and a wish photo are two more values on step 6's presign, `pending/`, claim, expire machinery. The whole change to the upload endpoint is two entries on a `Literal`:

[![The upload endpoint's resource_type Literal gains wishlist_photo and wish_photo alongside the profile and cover kinds](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-kinds.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/routes/upload.py)

Sharing the planner is what forced it to grow up. In step 6 it compared photos by S3 key, not raw signed URL, and that was enough while only the profile stored images. The moment a third route reused it, the shape it trusted stopped being proof:

[![plan_photo_update, hardened: reject a permanent or someone-else's key, reject a pending key whose stamped owner isn't the caller, and head_object the key to confirm it exists before claiming](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-teeth.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/backend/app/utils/s3_helpers.py)

Now that three routes store photos, the shared planner rejects a `pending/` key whose stamped owner isn't the caller, and it `head_object`s the key to confirm it still exists before any claim, so a replayed or hand-forged key can't quietly alias one object behind two records. The key-based compare from step 6 stays underneath all of it: a signed read echoed back still resolves to the stored object, so an unchanged save is a clean no-op rather than a self-delete.

## Deploy it

This step adds infrastructure: three DynamoDB tables (`wishlists` with its `CreatedByIndex`, `wishes` with its `WishlistIdIndex`, and the index-free `life-events`), plus one least-privilege grant per table on the running role. Deploy on a stack that is already up:

[![Three deploy commands: terraform apply for the tables and IAM, the deploy script to rebuild the image, then the one-time idempotent life-events seed](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/07-collections/infra)

The seed is not optional. Skip it and `GET /life-events` returns an empty list, and the create-wishlist screen has no occasions to offer. It upserts by id, so running it again is harmless; run it once after every fresh apply.

The IAM split is the part worth reading. Each table gets exactly the actions its routes use, and `life-events` gets the tightest set of all:

[![The life-events IAM statement: the running role is granted dynamodb:Scan on that table and nothing else, so it can read reference data but never write it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-07-code-iam.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/07-collections/infra/iam.tf)

The running role can Scan the reference data and nothing more. Seeding it is a developer-credential job, so the service can't put or overwrite an occasion even if a bug told it to. (One deploy-time ghost carries over from step 6: a fresh `terraform apply` can die with a bare `CREATE_FAILED` and empty logs. With the role, its grants, and the `apprunner.tf` `depends_on` all present, there is no config left to fix. Terraform taints the service, so apply again and it comes up `RUNNING` on identical input. Retry, don't hunt.)

## What bit me

Three things cost me time on this step, worst first:

**A price that blew up the write.** The first wish I saved with a cost 500'd: `Float types are not supported. Use Decimal types instead.` DynamoDB's document API rejects Python floats outright. `cost` now stores as `Decimal(str(value))` and the response model coerces it back to a float on read. Two more bounds ride along on the model, and each stops a different 500 the 422 should have caught first: JSON's parser waves `Infinity` and `NaN` straight through (`allow_inf_nan=False` rejects them), and DynamoDB refuses any magnitude past about 9.9e125 (`le=1e12` keeps a real price far under that ceiling). Drop either bound and a well-formed body detonates in the serializer instead of getting a clean 422.

**A wishlist list in nonsense order.** `GET /wishlists/me` came back shuffled. `CreatedByIndex` is hash-only, and a GSI with no range key returns items in no defined order, so "newest first" simply wasn't true. DynamoDB won't sort it for me without a sort key, so the handler sorts in Python after the Query. ISO-8601 timestamps sort lexically exactly as they sort in time, so it is a plain reversed string sort, not date parsing.

**A shared photo planner that trusted the shape.** Step 6's key-based photo compare was enough while only the profile stored images. The moment wishlists and wishes reused the same `plan_photo_update`, I could see the shape it trusted wasn't proof: a `pending/` key parses fine even if another user uploaded it, or if it was already claimed and its URL got replayed. So the shared version grew teeth, an owner check and a `head_object` existence check, before anything is promoted. Extraction did not just move the function; sharing it is what exposed what it had been assuming.

## You're done when

- [ ] Creating a wishlist under an occasion shows it in My Stuff newest-first, the moment you return.
- [ ] Adding a wish with a name, cost, link, and photo, then opening it, renders the cost with the currency symbol and loads the photo over a signed URL.
- [ ] Marking a wish fulfilled flips the state with no reload, and it is still fulfilled when you reopen it.
- [ ] `curl $API/wishlists/me` with no token returns 401; `GET /wishlists/{id}` on another account's wishlist returns 403; a made-up id returns 404. (Run this before deleting your account below: after that, no new token can be minted.)
- [ ] Deleting a wishlist takes its wishes and their photos with it: no orphan rows, no orphan objects.
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
- **05 · Two Places at Once** (publishing soon)
- **06 · Photos Without the Exposure** (publishing soon)
- **07 · Whose Wish Is It Anyway?** (you are here)
- **08 · Storefronts** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
