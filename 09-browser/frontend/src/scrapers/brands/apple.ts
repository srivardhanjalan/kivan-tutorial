/**
 * Apple scraper (Electronics & Tech): the bespoke example.
 *
 * Apple's India store deviates from the shared extraction in a way the factory
 * can't express, so it is a hand-written scraper. An Apple product page is
 * thick with financing noise: EMI lines ("₹4,158/mo"), cashback, and card
 * offers, all rendered as ₹ amounts. The shared context filter isn't enough,
 * so this scraper (a) scans ₹ only (apple.com/in quotes solely in rupees) and
 * reports INR via defaultCurrency, (b) rejects any amount under ₹10,000, which
 * on Apple's catalog is always an instalment rather than a price, and (c) skips
 * amounts next to instalment/offer words. Image and title use the shared
 * defaults/helper; only the price logic is special.
 */

import { BrandScraperConfig, extractTitleFromMetadata } from '../methods/firecrawl';
import { priceContext, isNoisePriceContext } from '../lib/priceContext';
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
// Beyond the shared noise words, an Apple page's financing vocabulary (EMI,
// cashback, card offers) sits beside ₹ amounts that are not the price.
const APPLE_FINANCING_NOISE = ['cashback', 'credit', 'instant', 'get ₹', '/mo'];

function extractApplePrice(html: string, markdown: string): { price: number } | null {
  for (const text of [markdown, html]) {
    if (!text) continue;
    RUPEE_PRICE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RUPEE_PRICE.exec(text)) !== null) {
      const price = parseFloat(m[1].replace(/,/g, ''));
      const context = priceContext(text, m.index, m[0].length);
      if (!isNaN(price) && price >= APPLE_PRICE_FLOOR && !isNoisePriceContext(context, APPLE_FINANCING_NOISE)) {
        return { price };
      }
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
