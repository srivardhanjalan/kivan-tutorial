/**
 * The scraper orchestrator: turn a browsed product URL into a wish draft.
 *
 * scrapeProduct picks the best scraper for the URL: a dedicated brand scraper
 * when one claims the host, otherwise the generic Firecrawl scrape. The in-app
 * browser is the only caller; it hands over the current page URL and opens the
 * add-a-wish modal with whatever comes back.
 *
 * To add a brand: drop a file in brands/ (see README.md), then register it in
 * BRAND_SCRAPERS below. A standard storefront needs only a few lines through
 * makeStandardScraper; a store that needs special price logic is a bespoke
 * module (see brands/apple.ts).
 */

import type { ScrapedProduct } from './types';
import { scrapeWithFirecrawl } from './methods/firecrawl';
import { BrandScraper } from './types';
import { appleScraper } from './brands/apple';
import { nykaaScraper } from './brands/nykaa';
import { pumaScraper } from './brands/puma';
import { zaraScraper } from './brands/zara';

/** The dedicated brand scrapers, tried in order until one claims the URL. */
const BRAND_SCRAPERS: BrandScraper[] = [
  zaraScraper,
  nykaaScraper,
  pumaScraper,
  appleScraper,
];

/**
 * Scrape a product URL into a wish draft. A dedicated scraper handles it when
 * one matches the host; otherwise the generic Firecrawl scrape runs. Never
 * throws: a total failure resolves to an all-null product so the browser can
 * still open the add-a-wish modal for manual entry.
 */
export async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  const brandScraper = BRAND_SCRAPERS.find((scraper) => scraper.canHandle(url));
  try {
    return brandScraper ? await brandScraper.scrape(url) : await scrapeWithFirecrawl(url);
  } catch (error: any) {
    console.warn(`[Scraper] Failed for ${url}: ${error?.message}`);
    return { price: null, image: null, title: null };
  }
}
