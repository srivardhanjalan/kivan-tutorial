/**
 * The shared BrandScraper shell.
 *
 * Every brand scraper is the same two things: a canHandle that matches the
 * URL's host, and a scrape that runs the page through the Firecrawl proxy with
 * the brand's config. Only the config differs (the standard extraction from
 * makeStandardScraper, or a bespoke one like apple.ts). This factory builds
 * that shell so neither the standard factory nor a bespoke module respells the
 * host match and the scrape call.
 */

import { BrandScraperConfig, scrapeWithFirecrawl } from '../methods/firecrawl';
import { BrandScraper, ScrapedProduct } from '../types';

export function makeScraper(
  hostnames: string[],
  config: BrandScraperConfig
): BrandScraper {
  return {
    canHandle(url: string): boolean {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostnames.some((host) => hostname.includes(host));
      } catch {
        return false;
      }
    },

    async scrape(url: string): Promise<ScrapedProduct> {
      return scrapeWithFirecrawl(url, config);
    },
  };
}
