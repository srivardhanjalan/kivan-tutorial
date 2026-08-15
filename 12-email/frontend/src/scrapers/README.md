# Scrapers

Turn a browsed product URL into a wish draft: `{ title, price, currency, image }`.
The in-app browser calls `scrapeProduct(url)`; everything else here supports it.

## Layout

```
scrapers/
├── index.ts                  # scrapeProduct(url), the orchestrator
├── types.ts                  # ScrapedProduct, BrandScraper
├── methods/firecrawl.ts      # the engine: proxy call + default extraction
├── lib/
│   ├── priceMatcher.ts       # currency-aware price detection (₹ $ £ € AED ...)
│   ├── makeScraper.ts        # the shared host-match + scrape shell
│   └── makeStandardScraper.ts# standard-extraction config over makeScraper
└── brands/                   # one file per dedicated brand
    ├── zara.ts  nykaa.ts  puma.ts   # standard (via the factory)
    └── apple.ts                     # bespoke (special price logic)
```

## How a scrape works

1. `scrapeProduct(url)` finds the first brand scraper whose `canHandle(url)` is
   true; if none match, it runs the generic Firecrawl scrape.
2. Every scraper calls `scrapeWithFirecrawl(url, config?)`, which POSTs the URL
   to the backend proxy (`POST /scrape/firecrawl`, where the API key stays
   server-side) and extracts a title, image, and price+currency from the page.
3. A scraper customizes extraction through a `BrandScraperConfig`
   (`extractPrice` / `extractTitle`, and a `defaultCurrency`). Anything it omits
   falls back to the default extraction (image is always the default: og:image,
   then a product `<img>`).

## Adding a brand

**Standard store** (its product pages yield to the shared extraction): a few
lines through the factory:

```ts
// brands/example.ts
import { makeStandardScraper } from '../lib/makeStandardScraper';

export const exampleScraper = makeStandardScraper({
  firecrawlBrandName: 'Example',
  hostnames: ['example.com'],
  titlePatterns: [/\s*[-|:@.]?\s*example\.com.*$/i],
});
```

**Bespoke store** (needs special price logic: a magnitude floor, a
single-currency lock, JSON-LD) is a hand-written module that builds its own
`BrandScraperConfig` and pours it into the shared shell with
`makeScraper(hostnames, config)`. See `brands/apple.ts`.

Then register it in `index.ts`'s `BRAND_SCRAPERS`, and seed the matching brand
in `infra/scripts/seed_brands.py` so the directory can reach it.
