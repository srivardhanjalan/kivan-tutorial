/**
 * Nykaa scraper (Beauty & Personal Care). A standard scraper: Nykaa's product
 * pages yield to the shared extraction. Nykaa is an India store, so prices come
 * through in ₹ and the matcher reports INR from the symbol.
 */

import { makeStandardScraper } from '../lib/makeStandardScraper';

export const nykaaScraper = makeStandardScraper({
  firecrawlBrandName: 'Nykaa',
  hostnames: ['nykaa.com'],
  titlePatterns: [
    /\s*[-|:@.]?\s*nykaa\.com.*$/i,
    /\s*[-|:@.]?\s*Nykaa.*$/i,
  ],
});
