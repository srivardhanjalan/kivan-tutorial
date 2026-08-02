/**
 * Core types for the scrapers module.
 *
 * A scrape turns a browsed product URL into the fields an add-a-wish draft
 * needs: a title, a price, the currency that price is in, and a photo. Every
 * field is nullable because a real page may not yield all of them (the
 * add-a-wish modal opens with whatever was found, and the user fills the rest).
 */

import type { CurrencyCode } from '../constants/Currency';

export interface ScrapedProduct {
  price: number | null;
  image: string | null;
  title: string | null;
  /** The source currency the matched price was quoted in (from the symbol or
      og:price:currency), when detectable. Null leaves the wish in the app
      default currency. */
  currency?: CurrencyCode | null;
}

export interface BrandScraper {
  /** Whether this scraper claims the given product URL (a hostname match) */
  canHandle(url: string): boolean;

  /** Scrape product data from the URL */
  scrape(url: string): Promise<ScrapedProduct>;
}
