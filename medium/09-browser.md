# The Price Is Right

*Zero to Shipped, step 9. Open any real store inside the app, browse to a product, and tap once: the live page becomes a wish, its price in the store's own currency. The scraper reads past the trade-in credit, the EMI line, and the struck-through tag to the one number that is real.*

![Zero to Shipped 09 hero: the in-app browser open on apple.com/in with an Add to wishlist bar across the bottom, beside a terminal where GET /brands with no token returns 401 and with a token returns the thirteen seeded stores, and POST /scrape/firecrawl proxies the page with the Firecrawl key attached server-side](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-hero-09.png?v=PLACEHOLDER)

*Step 09 of [**Zero to Shipped**](https://medium.com/@srivardhanjalan/zero-to-shipped-2c13ce7e20e9), a production social-wishlist app built one shippable step at a time on Expo, FastAPI, and AWS.*

*[All the code](https://github.com/srivardhanjalan/kivan-tutorial) is on GitHub, every step a runnable folder.*

## The problem

Step 8 gave the app a store. It was our store: four made-up shops, fifteen products, all seeded by us. The thing a person actually wants is almost never in it. It is on Apple's site, or Nykaa's, or a shop we have never heard of. So this step lets a wish come from any real store. You open the store inside the app, browse to the product the normal way, and tap once. The live page becomes a wish.

Drawing a list of stores is easy. Reading a real product page is not. A live storefront is built to sell, not to be parsed, and four things fight you at once.

- **A real page hides its price in a crowd of fake ones.** The selling price sits next to a struck-through original, an EMI figure per month, a trade-in credit, a cashback teaser. Grab the first currency number you see and you capture a decoy.
- **Every store speaks its own currency, and converting is a lie.** A rupee price and a dollar price cannot share one symbol. Honest conversion needs a live exchange-rate feed the app does not have, and hardcoded rates are wrong the day the market moves.
- **Reading a page needs a paid service, and its key cannot ship in the app.** Scraping runs through Firecrawl, which wants an API key. A mobile bundle is readable by anyone who downloads it, so the key cannot live in the frontend. The frontend is what is holding the URL to scrape.
- **The new store directory is a twin of the one step 8 already built.** Fetch a reference list, render logo-led rows, group them. Copy that screen and you now maintain two of everything, and they drift apart the first time you touch only one.

## What we build

A brand directory of thirteen real stores, grouped by category. Tap one and an in-app browser opens on its actual website. Browse to a product the ordinary way, tap **Add to wishlist**, and the page you are on is scraped into a wish: its name, its photo, and its price in the currency the store quoted. Pick a wishlist and it lands there, wearing the brand's logo as a badge. It reaches collections through the same one seam everything else does, the `POST /wishes` the manual form and the step-8 catalog already call.

One decision runs through all of it: a browsed page becomes a wish that keeps exactly what the store said, its real price in the store's own currency, captured once and never converted. The app does not translate the number, does not hold the scraping key, and does not invent a rate. It reads what is there and stores it as-is.

- **The directory is a third reference domain, the same shape as the first two.** One seeded, read-only DynamoDB table, one auth-gated `GET`, the running role granted `Scan` and nothing else. Adding a curated domain still costs two files and an IAM statement, not a new pattern.
- **The scraper picks the one real price, and reports the currency it found it in.** It prefers the store's own structured metadata, the live selling price, already free of the MRP (the printed maximum retail price on Indian listings) and the EMI prose. When it has to read the page body it filters out the figures that are not the price. The currency rides along with the price: an ISO code from the structured metadata, the symbol the matcher landed on in the body, or the store's known currency for a single-currency scraper like Apple's.
- **The Firecrawl key stays on the server.** The in-app browser posts a URL to a backend proxy; the proxy attaches the key from SSM and returns the page. The key never reaches a phone.
- **The screens that would have been copies share one shape.** The row that both directories list, the scaffold that both screens hang on, the modal that both add-paths raise: each moved into one place the moment a second caller wanted it, so the store directory and the Wish Store cannot drift apart.

Two things this step deliberately is not. It is not a display-currency picker: there is no setting that converts every price into your home currency, because that needs a live rate source and this step will not ship stale rates dressed as real ones. Per-store currency and conversion are separate concerns, and the picker is a later one. And it is not an admin catalog: the thirteen brands and their logos are seeded reference data, read by the app and never written by it. Uploading your own store logos and managing the directory is the admin dashboard in step 15.

**What we need:** step 8 complete, an AWS account, and the step-3 deploy in place. This step adds a real DynamoDB table and a second server-side secret, so like step 8 it wants a real backend: a deployed stack, or a local one with the table applied and seeded. It also needs a free [Firecrawl](https://firecrawl.dev) API key, listed back in step 1 as one of the accounts to create.

**Time:** about 60 to 90 minutes, most of it the deploy, the one-time seed, and a browse through a real store to watch a wish fill itself in.

**The code:** the snippets below are shown as images; the full, copyable source is [the step folder on `main`](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/09-browser), organized by the file paths in each caption. The build's whole story is [PR #72](https://github.com/srivardhanjalan/kivan-tutorial/pull/72/files), stacked on the baseline copy in [PR #67](https://github.com/srivardhanjalan/kivan-tutorial/pull/67/files).

## What we touch this step

Two dozen new files carry the feature, wired into the screens, config, and infra around them. Each build section below takes one area.

![What we touch this step, the new files grouped by folder and the existing ones they wire into: the backend brands route and scrape proxy that holds the Firecrawl key server-side, the frontend scraper engine with its currency-aware matcher and one bespoke brand, the in-app browser and brand directory screens and the row and scaffold both directories now share, the currency constants and currency-aware cost formatter, and the infra one read-only table with a second SSM secret and the seeder that uploads the logos; each file marked new or modified](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-filemap.png?v=PLACEHOLDER)

## Seed a directory nothing at runtime can write

The brand directory is the same for everyone. The tempting way to manage those rows is the easy one: hand-edit them in the DynamoDB console, or let the app write a brand the first time someone browses to it. Both hand the running server write access to a table it only ever reads. But every user browses the identical stores, so the running server has no reason to write the table, and every reason not to be able to. This is the reference-data shape step 7's occasions and step 8's catalog already set, and we lean on it a third time without changing it.

Brands are one plain table keyed by `id`, no index. The whole set is thirteen curated rows, read with one `Scan` that sits far under DynamoDB's single-page cap. There is no by-category endpoint, because the directory screen groups by category itself, on the client, off that one read.

[![GET /brands: an auth-gated Scan of the seeded real-store directory, sorted by display order](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-brands.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/backend/app/routes/brands.py)

The grant is what makes read-only real. The App Runner instance role gets `dynamodb:Scan` on the brands table and no write action on it, the same least-privilege line the life-events taxonomy and the storefronts catalog already carry. Once the running role cannot write, the seed cannot live in the app. It runs once, from your own AWS credentials, and that is the whole split.

The seed itself is thirteen real brands spread across categories and countries, and the countries are not decoration: an India store quotes rupees, a US store dollars, a UK store pounds, a UAE store dirhams. That spread is what makes the multi-currency capture real when you browse them. Each brand carries a placeholder logo, an honest stand-in showing the brand's initial on a colored wash, committed under `assets/brands/`, not an imitation of any real mark. The seed uploads each logo to the private photos bucket under the shared `catalog/` key and stores that object's bucket URL on the row, so the backend signs it on read exactly as it serves a storefront logo. No new S3 anything: the logos ride step 6's bucket and its read grant.

[![seed_brands.py: thirteen real brands across categories and countries, each logo uploaded to the photos bucket, idempotent upsert by id](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-seed.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/infra/scripts/seed_brands.py)

Apply this and the directory exists. It reads like a phone contact list, one row per store, grouped under its category heading, each row a logo, a blurb, and the country the prices will come in.

![The Wish Store gains a Browse real stores entry, and tapping it opens the brand directory: thirteen real stores grouped by category, each row a placeholder logo, a one-line blurb, and the country its prices are quoted in](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-fig-brands.png?v=PLACEHOLDER)

Now the app can list the stores. Next it has to open one, and to read a page from one it needs a key it cannot be allowed to hold.

## Keep the scrape key on the server

Reading a live product page is Firecrawl's job, and Firecrawl authenticates with an API key. The tempting version puts that key in the app: the in-app browser calls Firecrawl directly, one less hop, done. It also ships the key to every phone that installs the app. A mobile bundle is not a secret; anyone can pull it apart and read the strings inside. A key in the frontend is a key you have handed out.

So the key never reaches a phone. It follows the exact discipline the Clerk secret set in step 4: a SecureString in SSM, injected into the container at instance start, never a plaintext env var readable in the console.

[![ssm.tf: the Firecrawl API key as a SecureString, the second instance of the Clerk secret's pattern](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-ssm.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/infra/ssm.tf)

The frontend, which is holding the URL to scrape, posts it to a backend proxy instead. The proxy attaches the Bearer key from SSM, calls Firecrawl, and hands back the page. It is auth-gated like every data route, so only a signed-in user can spend a scrape.

The route is a plain `def`, not an `async def`, and that is deliberate. FastAPI runs a sync handler in a threadpool, which keeps the blocking Firecrawl call off the event loop. An `async def` body full of blocking calls stalls every other request the server is serving; a plain `def` with an `httpx.Client` sidesteps that entirely. The proxy also translates failure honestly: a Firecrawl timeout becomes a 504, a transport failure a 502, and a page Firecrawl rejects becomes `success: false` rather than leaking their status code as ours. The caller only needs to know the scrape yielded nothing, so it can fall back to letting you type the wish in by hand.

[![POST /scrape/firecrawl: the proxy attaches the SSM key server-side, threadpooled as a sync handler, mapping a slow upstream to 504 and a bad one to 502](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-proxy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/backend/app/routes/scraping.py)

![The scrape path, key-side: the in-app browser POSTs the current page URL to the backend proxy, the proxy attaches the Firecrawl key from SSM and calls Firecrawl, and the page comes back; the key is added only at the backend and never travels to the phone](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-scrape.png?v=PLACEHOLDER)

The key is safe and the page is reachable. Now the app opens the store.

## Open the store, then read the page you land on

Tapping a brand opens the in-app browser: a full-screen `WebView` on the store's real website, with the chrome to drive it (close, back, forward, reload) and one prominent action, **Add to wishlist**. You browse to a product page the way you would in any browser. The `WebView` is a native module, so it is added with `npx expo install react-native-webview`, never a hand-pinned version: the pinned range is the one Expo Go's renderer expects, and a native dependency that skews from it crashes on launch.

Add scrapes the page you are on. There is a subtle trap in what "the page you are on" means. React state lags a beat behind the live `WebView`, so reading the URL from a `useState` value can scrape the page you were on one navigation ago. The live URL is kept in a ref instead, updated on every navigation event, so Add reads the page you are on right now.

[![InAppBrowserScreen: a WebView with disabled-able back and forward chrome, Add scrapes the live URL from a ref and stamps brand_id onto the draft](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-browser.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/screens/InAppBrowserScreen.tsx)

Whatever the scrape finds, the add-a-wish modal opens. If it read a title, a price, and a photo, they are prefilled. If it read nothing, the modal still opens with the page URL and a name to edit, so a page the scraper cannot parse becomes a wish you fill in by hand instead of a dead end. The draft always carries the brand whose site this browser opened, so the wish can wear that brand's logo later.

![The in-app browser open on apple.com/in with its Add to wishlist bar, beside the picker it opens: the modal is prefilled with the scraped product name, and routes you to create a wishlist first when you have none yet](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-fig-browser.png?v=PLACEHOLDER)

The page is scraped, the modal is open. Everything now rides on the scrape having found the right number, and on a page like Apple's that is the hardest thing in the step.

## Pick the one real price

The naive scraper is easy to write: find the first currency-prefixed number on the page and call it the price. On a clean page it works. On a real one it is wrong almost every time, because a store page is thick with numbers that look exactly like prices and are not.

Open an iPhone on `apple.com/in` and the page carries, in rupees, an EMI line ("From ₹12199.00/mo."), a trade-in credit ("Get ₹2500.00 to ₹57000.00 for your trade-in"), instant cashback, and somewhere in there the real price, ₹69900. The first-number heuristic grabs the EMI. A slightly smarter one that skips small numbers grabs the ₹57000 trade-in figure. Every naive rule captures a decoy.

Two ideas fix it, and they compose. The first is to prefer the store's own structured metadata. A well-built product page publishes its selling price in an OpenGraph or `product:price` tag, and that number is the live price, already free of the MRP, EMI, and trade-in prose that litters the body. So the extractor reads that first, and only parses the page text when the metadata is absent.

[![firecrawl.ts: structuredPrice reads the canonical og:price / product:price metadata first, before any prose price is parsed](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-structured.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/scrapers/methods/firecrawl.ts)

Most stores carry that metadata. Apple does not: its price lives in the page body with all the noise, and no clean tag to fall back on. So Apple is the one bespoke scraper, and it carries four filters the shared factory cannot express. It scans rupees only, because `apple.com/in` quotes solely in rupees, and names INR directly rather than reading a symbol off the page. It rejects any amount under ₹10,000, which on Apple's catalog is always an instalment, never a price. It rejects a figure that is itself a monthly instalment, checked as a tight suffix on the amount rather than through a context window. And it drops any amount sitting next to a trade-in or cashback word, the same noise-window check the shared filter runs, widened with Apple's own financing vocabulary.

The instalment rule is the subtle one, and it is worth seeing why the obvious version fails. The usual way to reject a noisy price is to look at the words around it, a window of characters on each side, and drop it if "EMI" or "trade-in" is nearby. That window is exactly what catches the trade-in and cashback figures, and it is the fourth rule above. But Apple writes the EMI and the real price right next to each other: "From ₹12199.00/mo. ... or ₹69900.00". A window wide enough to catch the "/mo." on the instalment also catches the real price sitting beside it, and throws the real one away. So the instalment check is not a window at all. It reads the twelve characters immediately after the amount and disqualifies it only if a "/mo" or "per month" unit follows it directly. The EMI disqualifies itself; the real price beside it survives.

[![apple.ts: the bespoke scraper scans rupees only, floors sub-₹10,000 instalments, rejects the EMI by a tight per-amount suffix, and drops trade-in and cashback figures by the noise window](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-apple.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/scrapers/brands/apple.ts)

Everything Apple does specially, the other brands do not need, so they share one factory. Zara, Nykaa, and Puma each become a few lines of config: the hostnames to match and the SEO junk to strip from the title. A brand whose extraction turns out identical to the generic path is not kept as a near-clone; it falls back to the generic Firecrawl scrape, and the directory still seeds it. An abstraction with one honest caller is a defect, and a clone dressed as a brand is another.

Every shared scan goes through one currency-aware matcher. It knows the symbols the app supports, lists the multi-character dollar signs before the bare `$` so a Singapore price is never half-read as a US one, and reports the currency implied by whatever symbol it matched. Apple is the one exception: its rupee-only scan carries no symbol variety for the matcher to read, so it names INR from its own config instead. Either way, the currency travels out of the page and onto the wish.

![Picking the real price on Apple's page: the extractor rejects the EMI per-month figure, the sub-₹10,000 instalment, and the ₹57,000 trade-in credit, and keeps ₹69,900, the one amount that is the product's own price](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-price.png?v=PLACEHOLDER)

The scrape now returns a price and the currency it was quoted in. The wish has to keep both.

## Carry the currency onto the wish

A wish grows two fields this step: `cost_currency`, the ISO code the price was quoted in, and `brand_id`, the origin the badge resolves from later. The tempting move is to normalize the price at capture: convert every scraped amount into one home currency, or store it as a ready-made display string like `₹69,900`. Both throw away the fact the wish most needs to keep, the currency the store actually quoted, and conversion also bakes in a rate that is wrong the day the market moves. So `cost_currency` stays a plain string label, not a `Decimal`, and it stores and reads with no coercion. A wish captured from a browsed store carries both new fields. A wish typed by hand or added from step 8's catalog carries no currency, and reads in the app's default symbol, so the single-currency look is unchanged everywhere it was before.

[![wishes.py: cost_currency, a plain ISO-code label captured beside cost, and brand_id, the browser-captured origin, both new WishCreate fields stamped once at create time](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-wishmodel.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/backend/app/models/wishes.py)

The currency is captured once, at scrape time, and never edited. The update route ignores it entirely: a wish's currency is a fact about where it came from, not a field you tweak later. So `WishUpdate` does not carry `cost_currency` at all, and the comment in the model says why.

On the way out, one formatter renders every cost, and it is the only place a cost becomes a string. Pass it a currency code and it prefixes the matching symbol; pass it nothing and it uses the app default. The symbols mirror the tokens the matcher reads, so a price scraped as `₹` round-trips back to `₹`, a `£` back to `£`. There is no conversion here and there is no rate table, on purpose. A rupee price reads in rupees and a dollar price in dollars, each shown exactly as its store quoted it.

[![formatCost.ts: one formatter prefixes the symbol for a captured currency code, or the app default when none; no conversion, no rate table](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-currency.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/utils/formatCost.ts)

![Currency travels with the price, end to end: a rupee store's scrape stores cost_currency = INR and reads ₹, a dollar store's stores USD and reads $, each captured once and never converted, while a catalog or hand-typed wish carries no currency and reads in the app default](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-currency.png?v=PLACEHOLDER)

The wish now holds the right price in the right currency. The last thing it needs is to look like it came from somewhere.

## Badge it, and share the scaffold

A wish captured in the browser wears the brand's logo, the same way a step-8 catalog wish wears its store's. The mechanism is deliberately identical. A catalog wish carries a `storefront_id`; a browser-captured wish carries a `brand_id`; a hand-typed wish carries neither. One hook, `useWishOrigin`, resolves whichever one is set back to that source's name and logo, so the badge can never drift between the tile and the detail. The wish tile shows the logo in a corner; the wish detail reads "From Apple" above the title.

[![useWishOrigin.ts: one resolver turns a wish's storefront_id or brand_id into the source's name and logo, so a sourced wish wears its origin everywhere it shows](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-origin.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/hooks/useWishOrigin.ts)

![Two wish detail screens side by side: the browser-captured AirPods wish reads "From Apple" above its title and its cost is ₹67,900, in rupees, the currency apple.com/in quoted, while the catalog Ceramic Table Lamp beside it reads "From Nestwell"; both badges resolve from the origin the add-flow stamped on](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-fig-badge.png?v=PLACEHOLDER)

That badge is the visible half. The invisible half is that the whole browse experience shares its shape with the Wish Store next door, and neither screen respells it. The store directory and the Wish Store are the same screen: fetch a reference list, render logo-led rows under category headings. Built as copies they would be near-identical, drifting apart on the first one-sided edit. So the row lives once, and it takes data, not markup. A caller hands it a title, a logo, a blurb, a country, and whether the row leads onward; it never hands it JSX. That is what lets each screen stay a fetch, a row, and its sections, and reach for nothing lower.

[![CatalogRow.tsx: the one glyph-or-logo row both directories list, taking data (a title, a logo, meta lines) so neither screen respells the markup](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-directory.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/components/CatalogRow.tsx)

The add-to-wishlist modal is the third shared piece, and it is the one seam into collections. Both add-paths, the step-8 product detail and this step's browser scrape, build one small `WishDraft` and hand it to the same modal. The modal loads your wishlists, preselects the first, and on confirm creates a wish through the same `POST /wishes` the manual form calls. Open it with no wishlists yet and it routes you to create one instead of dead-ending on an empty picker.

[![AddToWishlistModal: both add-paths build one WishDraft the modal turns into a wish through the same POST /wishes, routing to create-a-wishlist when there are none](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-addmodal.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/blob/main/09-browser/frontend/src/components/AddToWishlistModal.tsx)

## Deploy it

This step adds infrastructure: one DynamoDB table (`brands`, read-only, no index), one SSM SecureString for the Firecrawl key, and the grants to match. The logos reuse step 6's photos bucket and its read grant, so no S3 infrastructure is added. Deploy on a stack that is already up, then run the seed once so the directory has both rows and logos:

[![The three deploy commands: terraform apply with firecrawl_api_key set, the image rebuild, and the one-time brand seed with PHOTOS_BUCKET_NAME](https://raw.githubusercontent.com/srivardhanjalan/kivan-tutorial/main/mocks/mocks-09-code-deploy.png?v=PLACEHOLDER)](https://github.com/srivardhanjalan/kivan-tutorial/tree/main/09-browser/infra)

`terraform.tfvars` gains one line, `firecrawl_api_key`, alongside the Clerk key it already holds. Like `seed_storefronts.py`, `seed_brands.py` is not optional: without it, `GET /brands` returns an empty list and the directory has nothing to browse. Pass it `PHOTOS_BUCKET_NAME` from `terraform output` so it knows where to upload the logos. It is idempotent, so a re-run is harmless. And if a fresh `terraform apply` dies with a bare `CREATE_FAILED` and no logs, run the apply again: App Runner's service creation is intermittently flaky, and a plain retry brings it up on identical config.

## What bit me

Four things cost me time here. One waited for the first real end-to-end run and then failed loudly, and it was the worst of them; the rest the gate and a review pass caught before anything shipped.

**The scraper kept picking a decoy price.** This is the one that bit hardest, because it passed every test I could write and then failed on the real page. I browsed to an iPhone on `apple.com/in`, tapped Add, and the wish came back priced at ₹57,000. The real price was ₹69,900. Two separate bugs were feeding it. My EMI filter looked at a window of nearby text, and because Apple prints the EMI right beside the real price, that window flagged ₹69,900 as EMI-adjacent and threw it out along with the instalment, so every real price died the same way. Meanwhile the ₹57,000 trade-in credit walked straight through, because the guard meant to catch it searched for the literal `get ₹`, which never matched once Firecrawl escaped the space between the word and the symbol. The price section walks through both fixes: reject an EMI figure by a per-amount suffix so it disqualifies only itself, and add `trade` to the noise words the window does catch. I verified against four live pages, not one, and it surfaced a second bug I had not gone looking for: Nykaa was returning its struck-through MRP, ₹649, instead of the ₹422 it was actually selling at. The structured-price preference fixed that one for free, because Nykaa publishes the real ₹422 in `product:price:amount`, while Apple emits no such tag and stays on the text scan. Apple went from ₹57,000 to ₹69,900, Nykaa from ₹649 to ₹422, and Zara and Puma did not budge.

**Seeding Apple at the wrong store would have poisoned every price.** The Apple scraper reads rupees and only rupees, because it is built for `apple.com/in`. I first seeded the brand pointing at `apple.com`, the US store, which quotes in dollars. Nothing crashed. It was worse than a crash: browsing that store would have fed a rupee-only scanner a page full of dollar amounts it is physically unable to read, and every scrape would have come back empty or wrong, with no error to point at. A single-currency scraper and the store URL it is seeded against have to name the same storefront, and there is no runtime check that they do, because the currency is a fact about the page, not the code. I caught it reading the seed against the scraper, and pointed Apple at `apple.com/in`. The lesson stuck: a bespoke scraper's assumptions are only as true as the seed row that feeds it.

**Adding the directory re-created the screen next to it.** `BrandsScreen` started as a copy of `StorefrontsScreen`, and jscpd flagged the identical import block, the row shell, and the styles immediately. I extracted the shared row first, which felt like the fix and was not: the two screens' import lists were still byte-identical, because two sibling list screens reach for the same pile of primitives even after the row is shared. The clone only cleared when the row stopped taking markup and took data, the shape the build section lays out. Once it did, each screen imported a handful of high-level pieces and nothing lower, and the duplication was gone for real. A twin screen is a duplication suspect before it is anything else, and sharing the obvious piece is rarely the whole fix.

**Dead plumbing accumulated one field at a time.** The cleanliness gate kept surfacing fields I had added and never wired to anything. A `domain` on the Brand model, with a comment claiming it stayed in sync with `website_url`, which nothing enforced, so the comment was a lie the code would never catch. A `cost_currency` on `WishUpdate`, for an edit flow that does not exist. An `extractImage` hook on the scraper config that no brand ever supplied, because image extraction is always the shared default. Each pass of the deadweight lens surfaced one more, so I stopped fixing them one at a time and swept the whole class at once: I read every new field against a real caller before the gate did, and cut the ones that had none. A field with no caller at commit time is a defect, the same as dead code, and a comment that claims a relationship the code does not enforce is worse than no comment.

## You're done when

- [ ] The **Wish Store** tab has a **Browse real stores** entry, and tapping it shows the seeded brands grouped by category.
- [ ] Tapping a brand opens the in-app browser on its real website; close, back, forward, and reload all drive it.
- [ ] Browsing to a real product page and tapping **Add to wishlist** scrapes the page, opens the picker, and drops it into a wishlist as a wish.
- [ ] That wish's cost reads in the store's own currency (a rupee store shows `₹`, a dollar store `$`), not the app default.
- [ ] The wish wears the brand's logo as a corner badge, and its detail reads "From" that brand above the title.
- [ ] A page that scrapes nothing still opens the modal, so you can add it and fill in the details by hand.
- [ ] `curl $API/brands` with no token returns 401; with a valid token it returns the seeded directory.
- [ ] `curl -X POST $API/scrape/firecrawl` with a valid token and a `{"url": ...}` body returns `{success, data}`, or `success: false` when the page yields nothing.

## What's next

Step 10, Social: a follow graph and a Discover feed, so a wishlist finally has an audience beyond the person who built it.

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
- **09 · The Price Is Right** (you are here)
- **10 · Social** (coming soon)

**[All the code on GitHub](https://github.com/srivardhanjalan/kivan-tutorial)**
