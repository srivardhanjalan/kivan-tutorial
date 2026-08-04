# Step 09: Browser Acquisition

A wish can now come from a **real store's website**. Step 08 let a wish come
from a curated catalog; this step adds the other acquisition path: a **brand
directory** of real stores, an **in-app browser** that opens any of them, and
**product scrapers** that read a product's title, image, and price straight off
the live page. Tap a brand, browse to the product you want, tap **Add to
wishlist**, and the page becomes a wish, its price captured in the currency the
store quoted. It plugs into collections through the same one seam everything
else does: the `POST /wishes` the manual form and the catalog already use.

**Multi-currency, precisely.** A scraped price is captured and displayed in the
currency the store quotes it in (`₹`, `$`, `£`, `€`, `AED`, and the other codes
the matcher recognizes). This step does **not** add a per-user display currency
or currency conversion: honest conversion needs a live exchange-rate source, and
hardcoding stale rates would be a lie baked into the app. So each wish reads in
its own captured currency, and a manual or catalog wish (which carries none)
reads in the app's default symbol. A display-currency picker with conversion is
a later concern, not this step's.

**The exact delta this step adds:**
[PR #72 · Files changed](https://github.com/srivardhanjalan/kivan-tutorial/pull/72/files)

## Run it locally

Same two terminals as step 08, with one new secret. The backend now needs a
**Firecrawl API key** (the scrape proxy is required config, so it fails at
startup naming the variable if it is missing, exactly like the Clerk key). Get
one free at [firecrawl.dev](https://firecrawl.dev) (step 01 lists it as an
account). The new `brands` table is read through your local AWS credentials, so
a full local run wants the stack applied and the brands seeded (below), or the
directory is empty until you do.

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
CLERK_SECRET_KEY=sk_test_... FIRECRAWL_API_KEY=fc-... \
  .venv/bin/uvicorn app.main:app --reload
```

```bash
cd frontend
npx expo install            # SDK-matched versions (this step adds react-native-webview)
npx expo start -c --localhost
```

## Deploy it

This step **adds infrastructure**: one DynamoDB table (`brands`, read-only, no
index), one **SSM SecureString** for the Firecrawl API key, and the grants to
match. On a stack that is already up:

```bash
cd infra
# terraform.tfvars now also needs: firecrawl_api_key = "fc-..."
terraform apply                                     # + brands table, + Firecrawl SSM secret, + IAM
./scripts/deploy.sh                                 # rebuild :latest with the new routes
AWS_REGION=us-east-1 ENVIRONMENT=production \
  PHOTOS_BUCKET_NAME=$(terraform output -raw photos_bucket_name) \
  ../backend/.venv/bin/python scripts/seed_brands.py   # 13 brands + 13 logos (idempotent)
```

The Firecrawl key follows the Clerk key's discipline exactly: it lives only in
gitignored `infra/terraform.tfvars` (and your shell for a local run), reaches
the container as a runtime secret from SSM, and is **never** committed or
printed. Like `seed_storefronts.py`, `seed_brands.py` is **not optional**:
without it `GET /brands` returns an empty list and the directory has nothing to
browse. It uploads each brand's placeholder logo to the private photos bucket
(no new S3 infrastructure: the logos ride the same bucket and read grant as the
catalog images, served as short-lived signed URLs), so it takes
`PHOTOS_BUCKET_NAME` exactly as `seed_storefronts.py` does. It is idempotent
(upsert by id, overwrite each logo by key).

**Try it end to end:** open the **Wish Store** tab, tap **Browse real stores**
to open the brand directory (real stores grouped by category). Tap one: the
**in-app browser** opens on its website. Browse to an actual product page the
ordinary way, then tap **Add to wishlist**. The page is scraped (title, image,
price, and the price's currency), you pick a wishlist, and the product becomes a
wish there. Open **My Stuff** to that wishlist: the new wish shows the scraped
name, its price in the **store's own currency** (a rupee price reads `₹`, a
dollar price `$`), and the **brand's logo as a corner badge** (the same badge a
catalog wish wears for its store). A page that scrapes nothing still opens the
modal, so you can add it and fill the details in by hand rather than dead-end.

## What's here

```
backend/
  app/routes/brands.py         + GET /brands: an auth-gated Scan over the seeded
                                 real-store directory, ordered for display (the
                                 storefronts/life-events read pattern again)
  app/routes/scraping.py       + POST /scrape/firecrawl: the proxy that holds the
                                 Firecrawl key server-side, so the app bundle never
                                 does; a sync handler over httpx (threadpooled)
  app/models/brands.py         + the Brand record (name, website_url, category,
                                 country, logo_url); logo_url is signed on read,
                                 exactly like a storefront's logo
  app/models/scraping.py       + the scrape request/response envelope
  app/models/wishes.py         + cost_currency on a wish (a plain ISO-code label,
                                 not a Decimal): the currency a scraped price rode;
                                 + brand_id, the origin a browser-captured wish is
                                 badged by (the catalog's storefront_id twin)
  app/routes/wishes.py         stores cost_currency and brand_id on create; both are
                                 captured once at scrape time and not edited, so
                                 update ignores them
  app/main.py / database.py /  include the two new routers; the brands table
    config.py                  handle and name; the required firecrawl_api_key
infra/
  dynamodb.tf                  + the brands table (no index: a Scan feeds the one
                                 GET, and the directory groups by category client-side)
  ssm.tf                       + the Firecrawl key as a SecureString (the Clerk
                                 secret's pattern, second instance)
  apprunner.tf / iam.tf        inject FIRECRAWL_API_KEY from SSM; grant the running
                                 role Scan on brands and read on both SSM secrets
  variables.tf / tfvars.example + the firecrawl_api_key variable and its placeholder
  scripts/seed_brands.py       + the directory seeder: 13 real brands across
                                 categories and countries (₹/$/£/€/AED span), each
                                 with a placeholder logo uploaded to the photos bucket
frontend/                      step 08's app plus:
  src/scrapers/                the scraper engine: scrapeProduct picks a brand
                                 scraper by host or falls back to generic Firecrawl;
                                 priceMatcher reads a price AND its currency; a few
                                 brand scrapers (zara/nykaa/puma via the standard
                                 factory, apple bespoke); README.md documents the shape
  src/screens/BrandsScreen.tsx      the brand directory, grouped by category
  src/screens/InAppBrowserScreen.tsx the WebView + its chrome + Add to wishlist
  src/components/CatalogRow.tsx     the logo-or-glyph row both directories now share
  src/hooks/useWishOrigin.ts        resolves a wish's storefront_id OR brand_id to
                                 that source's name and logo for the badge
  src/components/DirectoryLayout.tsx the directory-screen scaffold both now share
  src/components/AddToWishlistModal.tsx generalized: a Product OR a scrape both
                                 build one WishDraft it turns into a wish
  src/constants/Currency.ts         the currency codes the matcher emits + their symbols
  src/utils/formatCost.ts           now currency-aware (a code picks the symbol)
  src/services/api.ts               + the brand and scrape contracts, cost_currency
  src/components/{Navigation,WishCard,DetailTitleBlock,HeaderIconButton}.tsx,
  src/screens/{ProductDetail,WishDetail}.tsx  the routes, the currency-on-cost,
                                 the browser's disabled-able chrome buttons, and
                                 the brand badge (via useWishOrigin) on a captured wish
assets/brands/                 + 13 placeholder brand logos (initial-on-wash
                                 wordmarks), license-clean, uploaded by seed_brands.py
```

## The ideas this step plants

- **A third reference domain, the same shape as the first two.** Brands are a
  seeded, auth-gated, read-only Scan table, exactly like life-events and
  storefronts: one model, one GET, the running role granted Scan and nothing
  else, seeding a developer-credential job. A new curated domain still costs two
  files and an IAM statement, not a new pattern.
- **The secret stays on the server.** The Firecrawl key can't ship in a public
  app bundle, so the frontend never holds it: the in-app browser posts a URL to
  `POST /scrape/firecrawl` and the backend attaches the key from SSM. The proxy
  is a sync handler over `httpx` (FastAPI threadpools it), and it maps a slow
  upstream to 504 and a bad one to 502, so the app can tell "try again" from
  "type it in."
- **The second directory screen revealed the scaffold.** BrandsScreen is the
  Wish Store's twin (fetch a reference list, render it as logo-led rows). The
  moment the second one existed, three shared pieces earned their place:
  `CatalogRow` (both directories' rows, taking data so neither screen respells
  the markup), `DirectoryLayout` (the header/sections/empty scaffold), and
  `makeScraper` (every brand scraper's host-match + scrape shell). Each screen
  is now a fetch, a row, and its sections.
- **Currency travels with the price, end to end.** The matcher reports the
  currency implied by the symbol it found; the scrape carries it into the wish
  draft; the wish stores `cost_currency` beside `cost`; `formatCost` renders the
  symbol for that code. No conversion, no stale rates: a price is shown in the
  currency it was quoted in, and that is the honest whole of it.

## Gotchas

- **A bespoke scraper and the store you point it at must agree on currency.**
  The Apple scraper scans `₹` only, because `apple.com/in` quotes in rupees and
  its pages are thick with `₹` EMI/financing lines it has to filter out (with a
  magnitude floor: an amount under ₹10,000 on that catalog is an instalment, not
  a price). Seeded first at `apple.com` (the US store, in `$`), that scraper
  would have fed its rupee-only scan dollar prices it can't read. The captured
  currency comes from the page, so a single-currency scraper's logic and its
  brand's seeded `website_url` have to name the same storefront. The seed points
  Apple at `apple.com/in`.
- **A new screen re-creates the screen beside it.** BrandsScreen was modeled on
  StorefrontsScreen, and jscpd flagged the identical import block, the row
  shell, and the styles; the bespoke Apple scraper's `canHandle`/`scrape` was
  byte-identical to the standard factory's. Each resolved into a shared piece
  the moment the second caller existed, and the fix took a few rounds because
  extracting a shared row first left the two screens' *imports* still identical
  (two sibling list screens reach for the same toolkit). The clone cleared only
  when the row took **data** instead of markup, so each screen imports a handful
  of high-level pieces and nothing more, exactly as the grid screens lean on
  `TileGrid`/`ProductCard`. A twin screen is a duplication suspect before it is
  anything else.
- **A scraper factory only earns its place at the second caller.** The standard
  factory (`makeStandardScraper`) is shared by Zara, Nykaa, and Puma; Apple
  deviates for real, so it is bespoke and drops to the lower-level `makeScraper`
  shell directly. A "standard" brand whose extraction turned out byte-identical
  to the factory once `logCapture` was stripped (Nike) was **not** kept as a
  near-clone: it went to the generic Firecrawl path, and the directory still
  seeds it. An abstraction with one honest caller is a defect; a clone dressed
  as a brand is another.
- **The in-app browser drags a native module Expo Go must match.**
  `react-native-webview` is added with `npx expo install react-native-webview`,
  never a hand-pinned range: the pinned version is the one Expo Go's renderer
  expects, and any native dependency that skews from it crashes on launch.
- **A second SSM secret, and the same provisioning race.** The Firecrawl key
  follows the Clerk key exactly: a SecureString injected as `FIRECRAWL_API_KEY`,
  with **both** parameter ARNs in the one `ssm:GetParameters` grant the App
  Runner service `depends_on`. Add the second secret to `apprunner.tf` but not
  to that grant and the service can't read it at provision time, which is a
  `CREATE_FAILED` with no logs (cause #3 from step 04, one secret later).

## Done when

- [ ] Open the **Wish Store** tab and tap **Browse real stores**: the seeded
      brands show, grouped by category.
- [ ] Tap a brand: the in-app browser opens on its website; back, forward, and
      reload drive it, and close returns you to the directory.
- [ ] Browse to a real product page and tap **Add to wishlist**: the scrape
      fills the wish's name, price, and image, you pick a wishlist, and the
      product becomes a wish in it.
- [ ] Open that wish: its cost reads in the store's own currency (a rupee store
      shows `₹`, a dollar store `$`), not the app default.
- [ ] A page that scrapes nothing still opens the modal so you can add it by
      hand, instead of dead-ending.
- [ ] `curl $API/brands` with no token returns 401; with a valid token it
      returns the seeded directory.
- [ ] `curl -X POST $API/scrape/firecrawl` with a valid token and a `{"url": …}`
      body returns the scraped `{success, data}` (or `success: false` when the
      page yields nothing).

Next: `10-social`, a follow graph and Discover, so wishlists have an audience.
