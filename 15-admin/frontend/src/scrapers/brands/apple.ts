/**
 * Apple scraper (Electronics & Tech): the bespoke example.
 *
 * Apple's India store deviates from the shared extraction in a way the factory
 * can't express, so it is a hand-written scraper. An Apple product page is
 * thick with financing noise: EMI lines ("₹12199.00/mo. or ₹69900.00"),
 * trade-in credit ("Get ₹2500.00-₹57000.00 for your trade-in"), and cashback,
 * all rendered as ₹ amounts, and the page carries no og:price or JSON-LD offer
 * to fall back on. So this scraper (a) scans ₹ only (apple.com/in quotes solely
 * in rupees) and reports INR via defaultCurrency, (b) rejects any amount under
 * ₹10,000, which on Apple's catalog is always an instalment rather than a
 * price, (c) rejects a figure that is itself a monthly instalment (an EMI unit
 * follows it), which the shared window can't do: the EMI sits right next to the
 * real price ("From ₹12199.00/mo. ... or ₹69900.00"), so a window flags the
 * price too, and (d) skips amounts next to trade-in / cashback / credit words.
 * Image and title use the shared defaults/helper; only the price logic is
 * special.
 */

import { BrandScraperConfig, extractTitleFromMetadata } from '../methods/firecrawl';
import { priceContext, isNoisePriceContext, isInstalmentAmount } from '../lib/priceContext';
import { makeScraper } from '../lib/makeScraper';

const APPLE_TITLE_PATTERNS = [
  /\s*[-|:@.]?\s*apple\.com.*$/i,
  /\s*[-|:@.]?\s*Apple\s*\(IN\).*$/i,
  /\s*[-|:@.]?\s*Apple.*$/i,
];

// Below this, a ₹ amount on Apple's catalog is a monthly instalment, not a
// product price.
const APPLE_PRICE_FLOOR = 10000;
const RUPEE_PRICE = /₹\s*([0-9,]+(?:\.[0-9]{2})?)/g;
// Beyond the shared noise words, an Apple page's trade-in and cashback
// vocabulary sits beside ₹ amounts that are not the price. (EMI is not here:
// the instalment "/mo" belongs to a different figure right next to the real
// price, so it is rejected per-amount by isInstalmentAmount, not by window.)
const APPLE_FINANCING_NOISE = ['cashback', 'credit', 'instant', 'trade'];

function extractApplePrice(html: string, markdown: string): { price: number } | null {
  for (const text of [markdown, html]) {
    if (!text) continue;
    RUPEE_PRICE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RUPEE_PRICE.exec(text)) !== null) {
      const price = parseFloat(m[1].replace(/,/g, ''));
      if (isNaN(price) || price < APPLE_PRICE_FLOOR) continue;
      if (isInstalmentAmount(text, m.index, m[0].length)) continue;
      const context = priceContext(text, m.index, m[0].length);
      if (isNoisePriceContext(context, APPLE_FINANCING_NOISE)) continue;
      return { price };
    }
  }
  return null;
}

const config: BrandScraperConfig = {
  brandName: 'Apple',
  // apple.com/in quotes only in ₹; the ₹-only scan carries no symbol variety
  // for the matcher to report, so name the currency explicitly.
  defaultCurrency: 'INR',
  extractPrice: (html, markdown) => extractApplePrice(html, markdown),
  extractTitle: (_html, _markdown, metadata) =>
    extractTitleFromMetadata(metadata, APPLE_TITLE_PATTERNS),
};

// The bespoke price logic above is the only deviation; the host match and
// scrape call are the shared shell every brand scraper uses.
export const appleScraper = makeScraper(['apple.com'], config);
