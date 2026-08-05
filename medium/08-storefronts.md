# Off the Shelf

*Zero to Shipped, step 8. A store inside the app. Tap a product and the wish fills itself in: name, price, link, photo, and the store it came from. The app reads the catalog but can never write it.*

![Zero to Shipped 08 hero: the Wish Store tab listing four curated stores, each with its own logo and product count, beside a terminal where GET /storefronts with no token returns 401, with a token returns the seeded stores in display order, and a store's products come back with signed image URLs](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-08.png?v=PLACEHOLDER)

*Step 08 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

Every wish so far is typed by hand. Step 7's form works, but a wishlist stays empty until you type a name, a price, and a link for every item. This step lets a wish come from a catalog instead: tap a product and it lands in a wishlist already filled in, photo and all. Drawing the store list is the easy part. Making the catalog real is four problems at once.

- **The catalog is data the app must never overwrite.** Stores, products, and their images are shared reference data, one copy for every user. If the code that serves them can also write them, one bug or one breach rewrites the catalog for everyone.
- **A product's fields have to become a wish's fields with nothing in between.** Name, price, store link, blurb, photo, and which store it came from: each needs a home on a wish. Any gap between the two shapes forces a translation layer that breaks the first time either side changes.
- **The catalog's images have to be real without a second pipeline.** A product photo must be served as safely as a user's own upload, from the same private bucket, signed on read. But a catalog image is shared: many wishes point at one object, and no record owns it. So it can't ride the own-it-then-delete-it rules step 6 built for a user's photo.
- **Every new browse screen sits next to one you already built.** A product card is a wish card. A product detail is a wish detail. The category filter's row is the wishlist picker's row. Copy each one and you now maintain two of everything, and they drift the first time you touch only one.

## What we build

One decision answers all four: the catalog is shared data every user reads and only the seed writes, and it fills a wish through machinery the app already has, owning none of it. That splits into five moves, in order: seed two tables the running role can't write, serve their images through step 6's signing pipeline, read the stores and then a single store's products, build the browse screens from the wish screens' own parts, and turn a tapped product into a wish through the one `POST /wishes` the manual form already calls.

One thing this step still isn't: a catalog you can manage. Everything here is seeded reference data, read by the app and never written. Creating catalog entries and uploading your own logos and photos is the admin dashboard in step 15; per-store currency and real scraped storefronts are step 9.

**What we need:** step 7 complete, an AWS account, and the step-3 deploy in place. The catalog is two real DynamoDB tables and a set of images in the photos bucket, so like step 7 it wants a real backend: a deployed stack, or a local one with the tables applied and seeded.

**Time:** about 45 to 75 minutes, most of it the deploy and the one-time seed.

**The code:** the snippets below are shown as images; the full, copyable source is [the step folder on `main`](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/08-storefronts), organized by the file paths shown in each caption. The build came in two parts: [PR #71](https://github.com/srivardhanjalan/kivan-tutorial/pull/71/files) stood the read-only catalog up, and [PR #76](https://github.com/srivardhanjalan/kivan-tutorial/pull/76/files) gave it images, a store badge, a category filter, and a duplicate guard.

## What we touch this step

Twenty new files carry the feature, wired into the existing components, screens, config, and infra around them. Each build section below takes one area.

![What we touch this step, twenty new files grouped by folder and the existing ones they wire into: the backend catalog routes and models that sign their images on read, the shared photo helper that exempts catalog objects from a record's delete, the frontend Wish Store screens and the shared tile, hero, status, and picker-row pieces the wish screens now share too, and the infra two tables with a per-table read-only grant and the seeder that uploads the images; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-filemap.png?v=PLACEHOLDER)

## Seed a catalog nothing at runtime can write

The catalog is the same for everyone, so the running server has no reason to write it, and every reason not to be able to. The rest of the step leans on this, so we make it first.

Picture what a single compromised handler could do if the running role could write these tables: rewrite a store, swap a product's link, poison the catalog for every user at once. What stops that is the IAM grant, not careful code. The app's role gets read and nothing else. And once the running role can't write, the seed can't live in the app: it runs once, from your own AWS credentials. That is the whole split.

Two tables hold it. Storefronts is a plain table keyed by id, no index, because the whole set is small and gets read with one Scan. Products is keyed by id too, plus a `StorefrontIdIndex` so a store's products read without scanning the entire catalog:

[![The two DynamoDB tables: storefronts by id, products by id with a StorefrontIdIndex GSI](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-tables.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/infra/dynamodb.tf)

Then the grant that makes the split real. The App Runner instance role gets `Scan` on storefronts and `Query` on products and its index, and no write action on either: the same least-privilege shape the life-events taxonomy set in step 7.

[![The per-table IAM grant: Scan on storefronts, Query on products and its index, no write](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-iam.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/infra/iam.tf)

The seed script runs on your own credentials, never the container's. Four stores, fifteen products, nineteen images: a logo per store and a photo per product, license-clean placeholders committed under `assets/catalog/`. The seed uploads each image to the private photos bucket under a stable `catalog/` key, then writes each row with that object's bucket URL. It upserts by id and overwrites each image by key, so a re-run is a safe no-op. Each store row carries a denormalized `product_count`, so a store card can show a count without a per-store query:

[![The catalog seed: four stores, fifteen products, nineteen images uploaded to the photos bucket, idempotent upsert, product_count denormalized onto the store row](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-seed.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/infra/scripts/seed_storefronts.py)

![The catalog the runtime can't write: seeding runs on your own developer credentials and both uploads the images to the photos bucket and writes the two tables, while the App Runner instance role gets read-only access, a Scan on storefronts and a Query on products, and signs the images on read, with no write path to any of it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-seed.png?v=PLACEHOLDER)

The bucket name is the one thing the seed can't derive. The tables are named from `ENVIRONMENT`, but the bucket is account-suffixed and global, so the seed reads it from `PHOTOS_BUCKET_NAME`, the same value App Runner injects into the container. `terraform output -raw photos_bucket_name` prints it. Miss it and the seed refuses to run rather than upload nowhere.

Apply this and the catalog exists, its images just bytes in a private bucket. Next we make the app show them without being able to touch them.

## Serve the images the app reads but can't own

A catalog image lives in the same private photos bucket a user's wish photo does, locked shut since step 6: no public read, every object reached through a short-lived signed URL. So a store logo and a product photo are served exactly like a wish photo: the store row and product model each sign their URL on read, and the app renders whatever comes back. Nothing new gets built for the catalog.

[![The product model signs its image on read: image_url and category fields, a field_serializer that returns a short-lived signed URL](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-productmodel.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/models/products.py)

The one real difference is ownership, and it is where a naive reuse would have gone wrong. A user's photo belongs to one record: delete the wish or replace its photo, and step 6's rules reap the old object so nothing orphans. A catalog image is the opposite. It is shared: adding a product to a wishlist carries its photo onto the new wish, so many wishes legitimately point at one object, and none of them owns it.

Run the shared image through the per-record rules and the first wish delete would blank that product for every other wish pointing at it. So a catalog object is exempt: everything under the `catalog/` key prefix is skipped by the delete-the-old-object logic and the claim-this-upload logic alike. A wish that references a catalog image stores its canonical bucket URL and nothing more. Only the seed manages that keyspace.

[![The photos helper exempts the catalog prefix: a catalog key is stored as-is, never claimed and never marked for deletion, so a wish delete can't reap a shared image](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-s3catalog.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/utils/s3_helpers.py)

![Serving the catalog's images: the seed uploads each placeholder to the photos bucket under the catalog prefix, the backend signs that URL on read like any wish photo, and because the object is shared reference data it is exempt from the per-record claim and delete rules, so a wish delete never reaps an image other wishes still point at](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-signed.png?v=PLACEHOLDER)

With the images served, the reads that fetch them are next.

## Read the stores, then a store's products

Two endpoints serve the catalog, and both are auth-gated like every data route: the Wish Store tab sits behind sign-in. Reading it takes two hops, and they are two different reads.

The first is the store list. It is a Scan sorted by `display_order`, exactly the read the life-events taxonomy uses. A handful of curated rows with no natural key to query by is what a Scan is for:

[![GET /storefronts: an auth-gated Scan of the curated stores, sorted by display_order](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-storefronts.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/routes/storefronts.py)

The second hop is a store's products, and it is not a Scan. Scanning the whole catalog to find one store's rows gets slower with every product we add. So it is a Query on `StorefrontIdIndex`, scoped to the one store. The index is hash-only, so DynamoDB hands the products back in no useful order; we sort by `display_order` in the handler after the read, the same shape the wishes listing uses off its own index. The read runs through `query_all_pages`, because a single Query page truncates at 1 MB:

[![GET /storefronts/{id}/products: a Query on StorefrontIdIndex, paged to the end, sorted in the handler](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-products.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/routes/products.py)

![Reading the catalog in two hops: the Wish Store tab GETs the stores with a Scan of the whole small set, then opening one GETs that store's products with a Query on StorefrontIdIndex, scoped to the single store and never a Scan of the whole catalog](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-read.png?v=PLACEHOLDER)

One detail in the product model is why turning a product into a wish later costs nothing. DynamoDB rejects `float` outright, so the seed keeps every price as a string and writes `Decimal(price)`; the model coerces it back to a float on read. That is the exact path a wish's `cost` already takes, so a product's price and a wish's cost end up the same type after the same round trip, and a price drops straight onto a cost with no conversion. Each product also carries a `category`, which the store screen uses to build a filter, next.

## Browse it without cloning the screen next door

The **Wish Store** tab, empty since step 2, now mounts the store list, each row wearing its store's logo. Tap a store to see its products in the same grid the wishes ride, each tile a photo with a category pill; tap a product for its detail. If a store spans more than one category, a funnel in the header filters the grid to one. Every one of these screens is a sibling of a screen step 7 already built, and that is exactly the trap.

A product card is a wish card: an image tile, a name, a price below. A product detail leads with the same photo hero, title, price, and blurb a wish detail does. The picker that adds a product and the funnel that filters a store both raise the same single-select list. Built as copies, these would drift apart on the first one-sided edit. So none is a copy. Here is where each one went.

The image tile went first, with the most callers waiting. `ArtTileCard` is the one pressable tile-and-caption the wishlist card, the wish card, and now the product card all render. The photo fills its art block; when a record has none, a placeholder glyph stands in. The product tile and the wish tile are now one component with different data.

Then the photo hero. Both the product detail and the wish detail open with a big image and a title-price-blurb block below. `PhotoDetailHero` owns the image; `DetailTitleBlock` owns the three lines under it. The wishlist detail's hero is a different flavor, a life-event pastel and emoji, so it stays bespoke; the other two share.

Then the status line. A fulfilled wish shows a green check and "Fulfilled". A product already saved shows the same green check and "Already in Wishlist". That is one affirmative status with two labels, so `DetailStatusRow` is the check, the accent, and the layout in one place, and only the word changes.

Then the picker row. The add-to-wishlist picker and the category funnel both stack a single-select list: an outlined row, a label, a checkmark when chosen. `SelectableRow` and `SelectableList` are that row and its column, extracted the moment the funnel became the second caller. `CategoryFilterModal` filters the grid client-side, its categories drawn from the products already fetched, so it needs no extra request and can never list a category the grid can't show.

[![WishCard: the shared image tile, now wearing the store-logo badge when a wish came from the catalog](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-wishcard.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/frontend/src/components/WishCard.tsx)

![A store's products, browsed: each tile is the product's placeholder photo with a category pill, its name and price below, and the header funnel filters the grid to one category client-side from the products already fetched](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-fig-catalog.png?v=PLACEHOLDER)

Every one was pulled out on its second caller, never the first: with one caller you are building for a future that may never come, a defect the same as dead code. That leaves one thing: the seam that turns what you are browsing into a wish.

## Turn a product into a wish

This is the one place the catalog reaches into step 7's collections, and it is deliberately narrow. A product detail's **Add to Wishlist** opens a picker that loads your wishlists, preselects the first, and on confirm creates a wish through the same `POST /wishes` the manual form calls, copying the product's name, price, store link, blurb, and photo straight onto it, plus a `storefront_id` that stamps which store it came from. The catalog fills a wish; it never touches how a wishlist is stored or owned. Delete the storefronts code tomorrow and wishlists keep working.

Those fields carry over cleanly because of the naming convention. A product's store URL is `link_url` and its picture is `image_url`, the same names a wish uses, so the copy is straight. The price is the same free ride from the read section, a `float` landing on a `float`. There is no adapter between a product and a wish: one endpoint, and the fields already match.

[![AddToWishlistModal: pick a wishlist and create a wish through the same POST /wishes the manual form uses, carrying the product's photo and storefront_id onto it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-addwish.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/frontend/src/components/AddToWishlistModal.tsx)

The `storefront_id` earns its keep on the way back out. A wish that came from a store wears that store's logo as a corner badge on its tile, and its detail reads "From Nestwell" above the title. A hand-typed wish carries no `storefront_id`, so it wears no badge. One `useStorefronts` hook resolves the id back to its store wherever a wish shows, so the badge can't drift between the grid and the detail.

![A catalog wish, back in your list: the tile wears the store's logo badge in the corner, and the wish detail reads "From Nestwell" above the title, both resolved from the storefront_id the add-flow stamped on](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-fig-badge.png?v=PLACEHOLDER)

The add flow also refuses to save the same thing twice. A product detail reads every wish across your lists once, through a new `GET /wishes/mine`, and if this product's link is already saved it shows "Already in Wishlist" instead of the add button. The match is on `link_url`, the field a catalog wish carries over, so the same product is caught wherever you filed it. A wish could be in any of your lists, so the guard needs the whole-account read the per-wishlist listing can't give.

[![The wishes route: create stamps storefront_id, and GET /wishes/mine flattens every wish across your lists for the duplicate guard, declared before the id route so the literal path wins](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-mine.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/08-storefronts/backend/app/routes/wishes.py)

![Adding a product to a wishlist through the one seam: the product detail opens the picker, you choose a wishlist, and the app creates a wish through the same POST /wishes the manual form uses, carrying the product's name, price, link, photo, and storefront_id onto it](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-wish.png?v=PLACEHOLDER)

The picker also refuses to dead-end. Open it with no wishlists yet and it routes you to create one instead of leaving you stuck. Because the confirm always has a preselected target, there is no silent no-op where you tap Add and nothing happens.

![Adding a product with no wishlists yet: the picker preselects a wishlist and creates a wish through POST /wishes when you have lists, and routes you to the New Wishlist screen when you have none, so it never dead-ends on an empty picker](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-empty.png?v=PLACEHOLDER)

## Deploy it

This step adds infrastructure: two DynamoDB tables and a per-table read-only grant on the instance role. The catalog images reuse step 6's photos bucket and its read grant, so no S3 infrastructure is added. Deploy on a stack that is already up, then run the seed once so the catalog has both rows and images:

[![The three deploy commands: terraform apply, the image rebuild, and the one-time catalog seed with PHOTOS_BUCKET_NAME set](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-08-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/08-storefronts/infra)

Like the life-events seed, `seed_storefronts.py` is not optional: without it, `GET /storefronts` returns an empty list and the Wish Store tab has nothing to browse. Pass it `PHOTOS_BUCKET_NAME` from `terraform output` so it knows where to upload the images. It is idempotent, so a re-run is harmless. And if a fresh `terraform apply` dies with a bare `CREATE_FAILED` and no logs, run the apply again: App Runner's service creation is intermittently flaky. Terraform taints the failed service and replaces it on the next apply, so a plain retry brings it up on identical config. Nothing is wrong in the config, so don't go hunting for it.

## What bit me

Three things cost me time here. One waited for the first real run and failed loudly; the gate caught the other two.

**The seed died reaching for its own images.** I wrote the seed to load each placeholder from this step's `assets/catalog/`, two levels up from `infra/scripts/`, and noted that path in a comment one line above. Then the code resolved `parents[1]` instead of `parents[2]`, pointing at `infra/assets/`, a directory that does not exist. A bad path is neither a syntax nor a type error, so nothing caught it; it waited until the first real run, when the seed opened the first image and threw `FileNotFoundError`. The fix was one character. What stung: that comment had the right path all along; the code had drifted off its own spec. Comment right, code wrong, the one direction you never expect.

**Adding a screen re-created the one next to it.** Every browse screen started as a copy of the wish screen beside it; jscpd caught the byte-for-byte clones, the semantic pass the ones matching only in shape. The picker hand-rolled the confirm-and-cancel stack `ConfirmCancelButtons` already owned. Each extraction uncovered the next, so I re-ran the gate to a fixed point. A screen modeled on an old one is a likely duplicate, so I check it first.

**A token I reached for did not exist, then earned its way in.** I reached for `Spacing.xs` and `Typography.caption`; neither existed here, where tokens arrive only when first needed. tsc caught both. For the caption I used `Typography.bodySecondary`, which still is not a `caption`; for a 4pt gap I left a bare literal, until the audit found that 4pt in three places (the store card's two gaps and the tab bar's pill padding). Only then did `Spacing.xs` land, with three real callers.

## You're done when

- [ ] The **Wish Store** tab lists the seeded stores, each with its logo and its product count.
- [ ] Opening a store shows its products as tiles with photos and category pills, and opening a product shows its detail with the photo.
- [ ] A store with more than one category shows a filter in the header, and picking one narrows the grid to it.
- [ ] **Add to Wishlist** on a product, then picking a wishlist, drops it in as a wish with the product's price, link, and photo, and its tile wears the store's logo badge.
- [ ] Opening that wish shows "From" its store above the title.
- [ ] Re-opening the same product shows "Already in Wishlist" instead of the add button.
- [ ] With no wishlists yet, the picker routes you to create one instead of dead-ending.
- [ ] `curl $API/storefronts` with no token returns 401; with a valid token it returns the seeded stores, each with a signed `logo_url`.
- [ ] `curl $API/storefronts/nestwell/products` with a valid token returns that store's products in display order, each with a `category` and a signed `image_url`.

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
