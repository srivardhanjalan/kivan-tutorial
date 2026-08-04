/**
 * Factory for "standard" brand scrapers.
 *
 * Several brands (Zara, Nykaa, Puma, ...) share byte-identical extraction and
 * differ only in the hostname canHandle matches and the SEO patterns stripped
 * from the title. That shared logic lives here, parameterized by
 * StandardScraperConfig, so each brand file is a few lines of configuration.
 *
 * The shared extraction prefers the canonical structured price (og/product
 * metadata) when the store emits one: it is the live selling price, free of the
 * strikethrough MRP that a page-body scan would grab first (Nykaa lists
 * "Regular price ₹649. Discounted price ₹422." with the MRP first). Absent that
 * metadata it looks for a price NEAR the product title (the price sits under
 * the name), then falls back to a context-filtered scan that skips prices
 * sitting next to "cart"/"shipping"/"coupon"/"offer" and friends. All scans go
 * through the shared priceMatcher, so any supported currency (₹, $, £, €, ...)
 * is recognized and reported. Image extraction is the module default (og:image
 * → product <img>), and the title uses the shared metadata helper with the
 * brand's own patterns.
 *
 * A brand whose extraction deviates in any real way (a magnitude floor, a
 * single-currency lock, JSON-LD parsing) must NOT use this factory: keep it a
 * bespoke module in ../brands/ (see apple.ts).
 */

import { BrandScraper } from '../types';
import {
  BrandScraperConfig,
  extractTitleFromMetadata,
  structuredPrice,
} from '../methods/firecrawl';
import { matchAllPrices, matchPrice } from './priceMatcher';
import { priceContext, isNoisePriceContext } from './priceContext';
import { makeScraper } from './makeScraper';

export interface StandardScraperConfig {
  /** Brand label passed to scrapeWithFirecrawl (a console line on empty scrapes) */
  firecrawlBrandName: string;

  /** Hostname fragments matched by canHandle (e.g. ['zara.com']) */
  hostnames: string[];

  /** Brand-specific SEO patterns stripped from the raw title */
  titlePatterns: RegExp[];
}

// Beyond the shared noise words, a standard store's delivery line is not a
// product price either.
const STANDARD_NOISE = ['delivery'];

/**
 * The shared currency-aware price extraction: a price near the title, then the
 * first context-valid price in the markdown, then in the html.
 */
function extractStandardPrice(html: string, markdown: string, metadata: any) {
  // Try 0: the canonical structured price (the selling price, free of the
  // strikethrough MRP a body scan would grab first) when the store emits one.
  const structured = structuredPrice(metadata);
  if (structured) return structured;

  // Try 1: the first price within 500 chars after the product title (the
  // live sale price sits right under the name).
  const productTitle = metadata.ogTitle || metadata.title || '';
  if (productTitle && markdown) {
    const titleIndex = markdown.indexOf(productTitle);
    if (titleIndex !== -1) {
      const near = matchPrice(markdown.substring(titleIndex, titleIndex + 500));
      if (near) return { price: near.price, currency: near.currency };
    }
  }

  // Try 2 and Try 3: the first context-valid price in the markdown, then the html.
  for (const text of [markdown, html]) {
    for (const m of matchAllPrices(text)) {
      if (!isNoisePriceContext(priceContext(text, m.index, m.raw.length), STANDARD_NOISE)) {
        return { price: m.price, currency: m.currency };
      }
    }
  }

  return null;
}

export function makeStandardScraper(cfg: StandardScraperConfig): BrandScraper {
  const config: BrandScraperConfig = {
    brandName: cfg.firecrawlBrandName,
    extractPrice: (html, markdown, metadata) =>
      extractStandardPrice(html, markdown, metadata),
    extractTitle: (_html, _markdown, metadata) =>
      extractTitleFromMetadata(metadata, cfg.titlePatterns),
  };

  // The host match and scrape call are the shared shell (makeScraper); a
  // standard scraper is just this standard config poured into it.
  return makeScraper(cfg.hostnames, config);
}
