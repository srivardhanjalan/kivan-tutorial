/**
 * Puma scraper (Sports & Fitness). A standard scraper: Puma's product pages
 * yield to the shared extraction. Puma quotes in the local store currency
 * (€ on puma.com), which the price matcher reads from the symbol.
 */

import { makeStandardScraper } from '../lib/makeStandardScraper';

export const pumaScraper = makeStandardScraper({
  firecrawlBrandName: 'Puma',
  hostnames: ['puma.com'],
  titlePatterns: [
    /\s*[-|:@.]?\s*puma\.com.*$/i,
    /\s*[-|:@.]?\s*PUMA.*$/i,
  ],
});
