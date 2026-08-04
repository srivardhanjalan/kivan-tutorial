# Step 08: Storefronts

A wish no longer has to be typed from scratch. This step adds a **curated
catalog**: a handful of seeded stores, each holding a few products, browsable
from the **Wish Store** tab. Tap a store, tap a product, pick one of your
wishlists, and the product lands there as a wish with its name, price, link, and
photo already filled in, badged with the store it came from. It is the second
read-only reference domain in the app (the
life-events taxonomy was the first), and it plugs into step 07's collections
through exactly one seam: the same `POST /wishes` the manual form already uses.

The catalog is deliberately thin. Stores and products are **seeded reference
data**, read through auth-gated endpoints and nothing more. Each store carries
a logo and each product a photo and a category (the images are honest,
license-clean placeholders committed under `assets/catalog/`; the seed uploads
them to the private photos bucket and the backend serves them as short-lived
signed URLs, exactly like an uploaded wish photo), so the store directory, the
product tiles, and the category filter all run on real image and grouping data. What is still absent belongs to later
steps: no store or product creation, no ownership or admin roles, no uploading
your own logos and photos (the admin dashboard, step 15), and no per-store
currency (multi-currency scraping, step 09). What ships here is the smallest
honest thing that lets a wish come from a catalog.

**The exact delta this step adds:**
[PR #71 · Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/71/files)

## Run it locally

Same two terminals as step 07. The two new DynamoDB tables are read through your
local AWS credentials, so a full local run wants them to exist and be seeded:
apply the stack and run the storefronts seed (below) first, or the Wish Store
tab shows an empty catalog until you do. Everything else boots exactly as
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

## Deploy it

This step **adds infrastructure**: two DynamoDB tables (`storefronts`,
`products`, the latter with a `StorefrontIdIndex` GSI) and a per-table IAM grant
on the App Runner instance role (Scan on storefronts, Query on products, nothing
that can write). The catalog images reuse the existing photos bucket and its
read grant from step 06, so this step adds no S3 infrastructure. On a stack that
is already up, `terraform apply` creates the tables, the image redeploys, and
then a one-time seed uploads the images and populates the catalog:

```bash
cd infra
terraform apply                                     # + 2 tables, + per-table IAM
./scripts/deploy.sh                                 # rebuild :latest with the new routes
AWS_REGION=us-east-1 ENVIRONMENT=production \
  PHOTOS_BUCKET_NAME=$(terraform output -raw photos_bucket_name) \
  ../backend/.venv/bin/python scripts/seed_storefronts.py   # 4 stores, 15 products, 19 images (idempotent)
```

(The seed runs on the backend venv from "Run it locally"; create that first if
you came straight here to deploy. `ENVIRONMENT` must match your terraform
`environment` and `AWS_REGION` its `aws_region`: `production` / `us-east-1` are
the series defaults, so change both sides of a pair or neither.
`PHOTOS_BUCKET_NAME` is the private photos bucket the seed uploads the catalog
images to; `terraform output -raw photos_bucket_name` prints it, the same value
App Runner injects into the container.)

Deploying fresh? Follow step 03's staged bootstrap (registry, push, apply), then
the same three lines. Like the life-events seed, `seed_storefronts.py` is **not
optional**: without it `GET /storefronts` returns an empty list and the Wish
Store tab has nothing to browse. It is idempotent (upsert by id), so re-running
is harmless.

**Try it end to end:** open the **Wish Store** tab (the gift icon) to see the
seeded stores, each with its product count. Tap one to browse its products, tap
a product to see its detail, then **Add to Wishlist**. Pick a wishlist (the
first is preselected; with none yet, the picker sends you to create one) and the
product becomes a wish in it. Open **My Stuff** to that wishlist: the new wish is
there with the product's price as its cost and the store link as its link,
identical to one you typed by hand. **View product** on the detail opens the
store link in the browser.

## What's here

```
backend/
  app/routes/storefronts.py    + GET /storefronts: an auth-gated Scan over the
                                 seeded stores, ordered by display_order (the
                                 life-events read pattern, applied again)
  app/routes/products.py       + GET /storefronts/{id}/products: a Query on
                                 StorefrontIdIndex (never a Scan), sorted by
                                 display_order in the handler
  app/models/storefronts.py    + the Storefront record (id, name, description,
                                 product_count, display_order); reference data,
                                 no photo field this step
  app/models/products.py       + the Product record; price rides the same
                                 Decimal-in / float-out path as a wish's cost
  app/main.py                  includes the two new routers (they share the
                                 /storefronts prefix, the way wishes mounts twice)
  app/database.py / config.py  + the two table handles and their names
infra/
  dynamodb.tf                  + storefronts (no index) and products
                                 (StorefrontIdIndex)
  iam.tf                       + a least-privilege statement per table: the
                                 running role Scans storefronts and Queries
                                 products, and can write neither (seeding is a
                                 developer-credential job, like life-events)
  scripts/seed_storefronts.py  + the catalog seeder: 4 stores, 15 products,
                                 idempotent upsert, product_count denormalized
frontend/                      step 07's app plus:
  src/screens/StorefrontsScreen.tsx     the Wish Store tab: the store list
                                        (replaces the placeholder on AddWishTab)
  src/screens/StorefrontDetailScreen.tsx a store's products in the shared tile grid
  src/screens/ProductDetailScreen.tsx    a product's hero, price, blurb, store
                                        link, and the Add to Wishlist action
  src/components/ProductCard.tsx        a product tile (the shared ArtTileCard)
  src/components/AddToWishlistModal.tsx  the picker that turns a product into a
                                        wish via POST /wishes
  src/components/ArtTileCard.tsx        the image-tile card the wishlist, wish,
                                        and product cards now all share
  src/components/DetailTitleBlock.tsx   the title/price/blurb the wish detail and
                                        product detail both lead with
  src/hooks/useOpenExternalLink.ts      the open-a-link-or-toast the wish and
                                        product details both call
  src/services/api.ts                   + the storefront / product contracts
  src/components/{Navigation,TabNavigation}.tsx  the two pushed screens and the
                                        Wish Store tab mount
```

## The ideas this step plants

- **A second reference domain, the same shape as the first.** Storefronts and
  products are seeded, auth-gated, read-only tables, exactly like life-events:
  a Scan for the small unindexed set (stores), a GSI Query for the scoped set
  (a store's products), the sort in the handler, and the running role granted
  read and nothing else. A new curated domain costs two files and an IAM
  statement, not a new pattern.
- **One seam into an existing domain.** A product becomes a wish through the
  same `POST /wishes` the manual form uses. The catalog knows how to fill a
  wish's fields; it does not reach into collections' internals. Deleting
  storefronts would leave collections untouched, which is the test the jigsaw
  split is built to pass.
- **Extraction follows the second real caller.** Adding a product card next to
  the wish card, and a product detail next to the wish detail, created three
  concrete duplications. Each resolved into one shared piece the moment the
  second caller existed: `ArtTileCard` (the wishlist, wish, and product cards),
  `DetailTitleBlock` (both detail screens' title/price/blurb), and
  `useOpenExternalLink` (both details' link-open). None was built ahead of its
  second user.
- **Denormalize what the list reads.** A store card shows its product count, so
  the count is written onto the store row at seed time rather than counted per
  render. The seed owns the number because the seed is the only writer.

## Gotchas

- **Adding a screen re-creates the screen next to it.** A product card and a
  product detail landed beside the wish ones, and every shared shape had to move
  into one place: the pressable tile card (`ArtTileCard`, now behind the
  wishlist, wish, product, and add tiles alike), the detail title/price/blurb
  (`DetailTitleBlock`), the action button (`DetailAction`), and the
  open-a-link-or-toast (`useOpenExternalLink`). A couple were obvious up front;
  the gate caught the rest, each fix exposing the next. jscpd flagged the
  product detail's styles as byte-identical to the wish detail's; the semantic
  reviewer flagged the duplicated link-open with its shared error copy, a
  hand-rolled confirm/cancel stack that `ConfirmCancelButtons` already owned, and
  `AddTileCard` re-spelling the tile scaffold `ArtTileCard` had just been
  extracted to own. The rounds ran until a full gate pass found nothing. A new
  screen modeled on an old one is a duplication suspect before it is anything
  else.
- **DynamoDB rejects `float`, so a product price is a `Decimal` too.** The seed
  writes `Decimal(str(price))` and the model coerces back to `float` on read,
  the same path a wish's `cost` takes. A product added to a wishlist carries its
  price straight onto the wish's cost, one currency, no conversion (per-currency
  pricing is a step-09 concern).
- **The running role cannot seed the catalog.** The App Runner instance role
  gets Scan on storefronts and Query on products, and no write action on either.
  Seeding is a developer-credential job (`seed_storefronts.py` runs on your
  local AWS profile), so a fresh `terraform apply` needs the seed run once before
  the Wish Store tab shows anything. This is deliberate: the runtime cannot
  overwrite a store even if the code tried.
- **A GSI has no range key, so sort in the handler.** `StorefrontIdIndex` is
  hash-only, so the products Query returns items in no useful order; the
  `display_order` sort happens in Python after the paged read, exactly like the
  wishes listing off `WishlistIdIndex`. The products read goes through
  `query_all_pages` for the same reason wishes does: a single Query page
  truncates at 1 MB.
- **A token is missing until it earns its way in.** The port from the finished
  app reached for `Spacing.xs` and `Typography.caption`; neither existed here,
  because this tutorial adds a token the step a component first uses it, never in
  advance, and tsc caught both. The first pass used what existed
  (`Typography.bodySecondary`, and a bare `4` literal for the store card's
  gaps). Then the gate's own semantic reviewer found that `4` living in three
  homes (the store card's two gaps and the tab bar's pill padding), which is
  exactly the "a value used twice becomes a token" bar, so `Spacing.xs: 4`
  landed with its three real callers. `Typography.caption` never earned one:
  nothing needed it twice, so `Typography.bodySecondary` stayed.
- **App Runner images build ONLY on the colima-rosetta docker driver.**
  buildx/QEMU builds on Apple Silicon pass locally and die on AWS with
  `CREATE_FAILED` and no logs. `deploy.sh` builds on the right context; do not
  swap it. And a fresh `terraform apply` can still hit an intermittent bare
  `CREATE_FAILED` with no logs: re-run the apply (Terraform taints the failed
  service and replaces it), a plain retry is the fix.

## Done when

- [ ] Open the **Wish Store** tab: the seeded stores show, each with its product
      count.
- [ ] Open a store: its products show in the grid; open a product to see its
      detail.
- [ ] **Add to Wishlist** on a product, pick a wishlist: the product becomes a
      wish in that wishlist, its price the wish's cost and its store link the
      wish's link.
- [ ] With no wishlists yet, the picker routes you to create one instead of
      dead-ending.
- [ ] `curl $API/storefronts` with no token returns 401; with a valid token it
      returns the seeded stores.
- [ ] `curl $API/storefronts/nestwell/products` with a valid token returns that
      store's products in display order.

Next: `09-browser`, a brand directory and an in-app browser, so a wish can come
from a real store website, with prices scraped in each store's own currency.
