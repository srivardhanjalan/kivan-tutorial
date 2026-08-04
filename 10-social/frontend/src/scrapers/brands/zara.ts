/**
 * Zara scraper (Fashion & Apparel). A standard scraper: Zara's product pages
 * yield to the shared extraction, so this is just configuration. Zara quotes
 * in the local store currency (€ on zara.com), which the price matcher reads
 * from the symbol.
 */

import { makeStandardScraper } from '../lib/makeStandardScraper';

export const zaraScraper = makeStandardScraper({
  firecrawlBrandName: 'Zara',
  hostnames: ['zara.com'],
  titlePatterns: [
    /\s*[-|:@.]?\s*zara\.com.*$/i,
    /\s*[-|:@.]?\s*ZARA.*$/i,
  ],
});
