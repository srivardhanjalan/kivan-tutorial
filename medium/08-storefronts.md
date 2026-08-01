# Off the Shelf

*Zero to Shipped, step 8. A wish you pick from a store instead of typing from scratch: a seeded catalog the server reads but can never overwrite, dropped into any wishlist through the same endpoint the manual form already uses. Plus the duplication that piles up every time a new screen lands beside an old one.*

![Zero to Shipped 08 hero: the Wish Store tab listing four curated stores with product counts, beside a terminal where GET /storefronts with no token returns 401, with a token returns the seeded stores, and a store's products come back in display order](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-08.png?v=PLACEHOLDER)

*Step 08 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

Every wish in the app so far is typed by hand. Step 7 built the form, and it works, but a wishlist starts empty and stays empty until you fill in a name, a price, and a link for each thing you want. This step lets a wish come from a catalog instead: browse a store, tap a product, and it lands in a wishlist already filled in. Drawing the store list is the easy part. Making the catalog real is three problems at once.

- **The catalog is data the app must never be able to overwrite.** Stores and products are shared reference data, the same for every user. If the code that serves them can also write them, one bug or one breach rewrites the whole catalog for everyone.
- **A product has to become a real wish without the catalog reaching into wishlists.** The store lives in its own world; a wishlist lives in step 7's. Wire them together the wrong way and a change to one can corrupt the other.
- **Every new browse screen sits next to one you already built.** A product card is a wish card with a different label. A product detail is a wish detail. Copy each one and you now maintain two of everything, and they drift the first time you touch only one.

## What we build

A curated catalog: a handful of seeded stores, each holding a few products, browsable from the **Wish Store** tab. Tap a store, tap a product, pick one of your wishlists, and the product becomes a wish there with its name, price, and link already set. It answers all three problems.

- **The catalog is a second reference domain, seeded like step 7's occasions.** Two DynamoDB tables the app can read and its running role can't write: a Scan for the small set of stores, an index Query for a store's products. Nothing at runtime seeds or edits them; that runs once from your own credentials.
- **A product becomes a wish through the same `POST /wishes` the manual form uses.** The catalog knows how to fill a wish's fields; it never reaches into collections' internals. Delete the storefronts code tomorrow and wishlists keep working.
- **The screens that would have been copies share one shape instead.** The tile card, the detail block, and the open-a-link behavior each moved into one place the moment the product screens became their second caller, so the product and wish screens can't drift apart.

One thing this step deliberately skips: it is a read-only catalog and nothing more. No store or product creation, no admin roles, no product images, no per-store currency. Creating catalog entries is the admin dashboard in step 15; real store websites and prices scraped in each store's own currency are step 9. What ships here is the smallest honest thing that lets a wish come from a store.

**What we need:** step 7 complete, an AWS account, and the step-3 deploy in place. The catalog is two real DynamoDB tables, so like step 7 this step wants a real backend: a deployed stack, or a local one with the tables applied and seeded.

**Time:** about 45 to 75 minutes, most of it the deploy and the one-time seed.

**The code:** the snippets below are shown as images; the full, copyable source is [the step folder on `main`](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/08-storefronts), organized by the file paths shown in each caption. [PR #PR-NUMBER-TBD: Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/PR-NUMBER-TBD/files) is the build's story.

## What we touch this step

Fourteen new files carry the feature, wired into a handful of existing ones. Each build section below takes one area.

![What we touch this step, fourteen new files grouped by folder and the existing ones they wire into: the backend catalog routes and models, the frontend Wish Store screens and the shared tile and detail pieces the wish screens now share too, and the infra two tables with a per-table read-only grant and the seeder; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-filemap.png?v=PLACEHOLDER)

## Seed a catalog nothing at runtime can write

The catalog is the same for everyone, so the running server has no reason to write it, and every reason not to be able to. Get this wrong and a compromised handler can rewrite every store in the app. So we split the two jobs: the app's role reads the tables and can't touch them, and seeding runs once from your own AWS credentials.

Two tables hold it. Storefronts is a plain table keyed by id, no index, because the whole set is small and gets read with one Scan. Products is keyed by id too, plus a `StorefrontIdIndex` so a store's products read without scanning the entire catalog:

[![The two DynamoDB tables: storefronts by id, products by id with a StorefrontIdIndex GSI](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-tables.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/infra/dynamodb.tf)

Then the grant that makes the split real. The App Runner instance role gets `Scan` on storefronts and `Query` on products and its index, and no write action on either. This is the same least-privilege shape the life-events taxonomy set in step 7: the running role can read the reference data and nothing more.

[![The per-table IAM grant: Scan on storefronts, Query on products and its index, no write](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-iam.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/infra/iam.tf)

The catalog itself is a seed script that runs on your own credentials, never the container's. Four stores, fifteen products, an idempotent upsert by id so re-running is harmless. It writes each store with a denormalized `product_count`, so a store card can show a count without a per-store query:

[![The catalog seed: four stores, fifteen products, idempotent upsert, product_count denormalized onto the store row](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-seed.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/infra/scripts/seed_storefronts.py)

![The catalog the runtime can't write: seeding runs on your own developer credentials and writes both tables, while the App Runner instance role gets read-only access, Scan on storefronts and Query on products, and no write path at all](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-seed.png?v=PLACEHOLDER)

## Read the stores, then a store's products

Two endpoints serve the catalog, and both are auth-gated like every data route: the Wish Store tab sits behind sign-in. The stores endpoint is a Scan sorted by `display_order`, exactly the read the life-events taxonomy uses, because a handful of curated rows with no natural key to query by is what a Scan is for:

[![GET /storefronts: an auth-gated Scan of the curated stores, sorted by display_order](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-storefronts.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/routes/storefronts.py)

A store's products are different: never a Scan of the whole catalog, but a Query on `StorefrontIdIndex`, scoped to the one store. The index is hash-only, so it has no sort key, which means DynamoDB hands the products back in no useful order. We sort by `display_order` in the handler after the read, the same shape the wishes listing uses off its own index. And the read runs through `query_all_pages` because a single Query page truncates at 1 MB:

[![GET /storefronts/{id}/products: a Query on StorefrontIdIndex, paged to the end, sorted in the handler](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-products.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/routes/products.py)

One detail rides in the product model: a price is a `Decimal` in DynamoDB and a `float` on read. DynamoDB rejects `float` outright, so the seed writes `Decimal(str(price))` and the model coerces it back, the exact path a wish's `cost` already takes. That is why a product's price can drop straight onto a wish's cost with no conversion.

## Browse it without cloning the screen next door

The **Wish Store** tab, empty since step 2, now mounts the store list. Tap a store to see its products in the same grid the wishes ride, and tap a product for its detail. Three screens, and every one of them is a sibling of a screen step 7 already built, which is exactly the trap.

A product card is a wish card: an image tile, a name, a price below. A product detail leads with the same title, price, and blurb a wish detail does, and jumps to a link the same way. Built as copies, they would be four near-identical pieces drifting apart on the first one-sided edit. So each shared shape moved into one place the moment the product screen became its second real caller: `ArtTileCard` now backs the wishlist, wish, and product cards, and the add tile behind both New Wishlist and New Wish folded into it the same round; `DetailTitleBlock` backs both detail screens; `useOpenExternalLink` holds the one link-open call and its error copy. None was built ahead of that second caller.

[![ArtTileCard: the one pressable tile-and-caption the whole tile family shares](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-arttilecard.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/frontend/src/components/ArtTileCard.tsx)

## Turn a product into a wish

This is the one seam between the catalog and step 7's collections, and it is deliberately narrow. A product detail's **Add to Wishlist** opens a picker that loads your wishlists, preselects the first, and on confirm creates a wish through the same `POST /wishes` the manual form calls, carrying the product's name, price, and link straight onto it. The catalog fills a wish; it never touches how wishlists are stored or owned.

[![AddToWishlistModal: pick a wishlist and create a wish through the same POST /wishes the manual form uses](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-addwish.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/frontend/src/components/AddToWishlistModal.tsx)

![Adding a product to a wishlist: the product detail opens the picker, you choose a wishlist, and the app creates a wish through the same POST /wishes the manual form uses, carrying the product's name, price, and link onto it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-wish.png?v=PLACEHOLDER)

The picker also refuses to dead-end. Open it with no wishlists yet and it routes you to create one instead of leaving you stuck with nothing to pick. Because the confirm always has a preselected target, there is no silent no-op where you tap Add and nothing happens.

## Deploy it

This step adds infrastructure: two DynamoDB tables and a per-table read-only grant on the instance role. Deploy on a stack that is already up, then run the seed once so the catalog has something in it:

[![The three deploy commands: terraform apply, the image rebuild, and the one-time catalog seed](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/08-storefronts/infra)

Like the life-events seed, `seed_storefronts.py` is not optional: without it `GET /storefronts` returns an empty list and the Wish Store tab has nothing to browse. It is idempotent, so a re-run is harmless. And if a fresh `terraform apply` dies with a bare `CREATE_FAILED` and no logs, run the apply again: App Runner's service creation is intermittently flaky, Terraform taints the failed service and replaces it on the next apply, and a plain retry brings it up on identical config.

## What bit me

Two things cost me time on this step, worst first.

**Adding a screen re-created the one next to it.** Every browse screen I added started as a copy of the wish screen beside it, and the copies did not announce themselves. jscpd caught the byte-for-byte ones; a semantic pass caught the ones that only matched in shape, like the picker hand-rolling its own confirm and cancel stack when `ConfirmCancelButtons` already owned exactly that (swapping it in dropped a now-dead `PrimaryButton` import too). The draining part was the cascade: extract the shared tile and the shared detail block surfaces, extract that and the duplicated link-open is what's left, each fix uncovering the next. I ran the gate until a full pass found nothing. A new screen modeled on an old one is a duplication suspect before it is anything else.

**A token I reached for did not exist, then earned its way in.** Porting these screens, I reached for `Spacing.xs` and `Typography.caption`, and neither was in this codebase: it adds a token the step a component first needs one, never in advance. tsc caught both instantly. For the caption I used what was already there, `Typography.bodySecondary`. For a 4pt gap I dropped a bare literal, because one use does not earn a token. Then the audit gate found that same 4pt in three places at once, the store card's two gaps and the tab bar's pill padding, which is exactly the "a value used twice becomes a token" bar, so `Spacing.xs` landed with its three real callers, not on my first wish for it. `Typography.caption` never found a second use, so `bodySecondary` stayed and it still is not there. The one literal that survived is the 2px hairline under a tile's name, smaller than any scale step: a value stays a literal until the code asks for it twice.

## You're done when

- [ ] The **Wish Store** tab lists the seeded stores, each with its product count.
- [ ] Opening a store shows its products in the grid, and opening a product shows its detail.
- [ ] **Add to Wishlist** on a product, then picking a wishlist, drops it in as a wish with the product's price as its cost and the store link as its link.
- [ ] With no wishlists yet, the picker routes you to create one instead of dead-ending.
- [ ] `curl $API/storefronts` with no token returns 401; with a valid token it returns the seeded stores.
- [ ] `curl $API/storefronts/nestwell/products` with a valid token returns that store's products in display order.

## What's next

Step 9, Browser: a brand directory and an in-app browser, so a wish can come from a real store website, with prices scraped in each store's own currency.

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
- **08 · Off the Shelf** (you are here)
- **09 · Browser** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
