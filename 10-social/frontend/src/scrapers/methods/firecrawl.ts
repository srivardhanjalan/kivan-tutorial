/**
 * Firecrawl scraping method: the engine every brand scraper builds on.
 *
 * The frontend never holds the Firecrawl key; it POSTs the URL to the backend
 * proxy (services/api.scrapeUrl → POST /scrape/firecrawl), which attaches the
 * key from SSM. What comes back is Firecrawl's {success, data} envelope, where
 * `data` carries the page's markdown, html, and metadata. This module turns
 * that into a ScrapedProduct: a title, an image, and a price with the currency
 * it was quoted in.
 *
 * A brand scraper customizes extraction by passing a BrandScraperConfig: its
 * own extractTitle/extractPrice, and a defaultCurrency for stores that quote
 * one currency with no symbol the matcher can see. With no config, the default
 * extraction below handles a generic product page.
 */

import type { CurrencyCode } from '../../constants/Currency';
import { scrapeUrl } from '../../services/api';
import { ScrapedProduct } from '../types';
import {
  asSupportedCurrency,
  matchAllPrices,
  matchPrice,
  parseAmount,
} from '../lib/priceMatcher';

/** What a custom extractPrice returns: the amount plus the currency it was
    found in (from the matched symbol or og:price:currency), or null. */
type ExtractedPrice = { price: number; currency?: CurrencyCode | null } | null;

/** Per-brand extraction overrides. A brand supplies only the hooks it needs;
    anything absent falls back to the default extraction in this file. */
export interface BrandScraperConfig {
  /** Brand label, for a console line when a scrape returns nothing */
  brandName: string;
  /** Currency to report when the extractor and page yield no symbol: set on
      scrapers for stores that quote one currency the matcher can't see (a bare
      number with no symbol). */
  defaultCurrency?: CurrencyCode;
  extractPrice?: (html: string, markdown: string, metadata: any) => ExtractedPrice;
  extractTitle?: (html: string, markdown: string, metadata: any) => string | null;
}

/**
 * Scrape a product URL through the backend proxy, then extract the wish draft.
 * Custom hooks win where a config provides them; otherwise the defaults run.
 * A failed or empty scrape resolves to an all-null product (never throws), so
 * the caller can open the add-a-wish modal for manual entry regardless.
 */
export async function scrapeWithFirecrawl(
  url: string,
  config?: BrandScraperConfig
): Promise<ScrapedProduct> {
  const brandName = config?.brandName || 'Generic';

  const result = await scrapeUrl(url);
  if (!result.success || !result.data) {
    console.warn(`[${brandName}] Scrape returned no data`);
    return { price: null, image: null, title: null };
  }

  const data = result.data;
  const metadata = data.metadata || {};
  const html: string = data.html || '';
  const markdown: string = data.markdown || '';

  const title = config?.extractTitle
    ? config.extractTitle(html, markdown, metadata)
    : extractTitleFromMetadata(metadata);

  const image = defaultExtractImage(html, metadata);

  const extracted = config?.extractPrice
    ? config.extractPrice(html, markdown, metadata)
    : defaultExtractPrice(html, markdown, metadata);

  const price = extracted ? extracted.price : null;
  const currency = (extracted && extracted.currency) || config?.defaultCurrency || null;

  return { price, image, title, currency };
}

/**
 * Clean a raw page title down to the product name: strip the trailing
 * "| Brand.com", "- Buy Online", parenthetical variants, and size/pack
 * suffixes SEO leaves behind. Brand-specific patterns run first (a scraper
 * passes the junk unique to its store). Central helper: brand extractTitle
 * hooks and the default title extraction both call it.
 */
function cleanProductTitle(
  title: string,
  brandSpecificPatterns?: RegExp[]
): string | null {
  if (!title) return null;

  let cleaned = title;

  // Step 1: brand-specific patterns first (if provided)
  if (brandSpecificPatterns) {
    for (const pattern of brandSpecificPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // Step 2: common e-commerce site suffixes
  const brandPatterns = [
    /\s*[-|:@.]\s*[A-Z][a-z]+(?:\.com|\.in|\.co\.in).*$/i, // BrandName.com/in
    /\s*[-|:]\s*(?:Buy|Shop|Online|Price).*$/i, // Buy/Shop/Online suffixes
  ];
  for (const pattern of brandPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Step 3: "Buy"/"Online" leaders and trailers
  cleaned = cleaned.replace(/^Buy\s*[-|:]\s*/i, '');
  cleaned = cleaned.replace(/^Buy\s+/i, '');
  cleaned = cleaned.replace(/\s*[-|:]\s*Buy.*$/i, '');
  cleaned = cleaned.replace(/\s+Online.*$/i, '');
  cleaned = cleaned.replace(/\s*[-|:]\s*Shop.*$/i, '');

  // Step 4: parenthetical and bracketed content (sizes, colors, bundles)
  cleaned = cleaned.replace(/\(.*?\)/g, '');
  cleaned = cleaned.replace(/\[.*?\]/g, '');
  cleaned = cleaned.replace(/\{.*?\}/g, '');

  // Step 5: split on separators, keep the first meaningful part
  const separators = [' : ', ' | ', ' - ', ' . ', ': ', '| '];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const firstPart = cleaned.split(sep)[0].trim();
      if (firstPart && firstPart.length >= 5 && firstPart.length < 200) {
        cleaned = firstPart;
        break;
      }
    }
  }

  // Step 6: split on comma (variants often follow one)
  if (cleaned.includes(',')) {
    const firstPart = cleaned.split(',')[0].trim();
    if (firstPart && firstPart.length >= 5) {
      cleaned = firstPart;
    }
  }

  // Step 7: size/variant/pack keywords
  cleaned = cleaned.replace(
    /\s*[-,]\s*(?:Pack of|Set of|Combo|Bundle|Size|Color|Colour|Model|Variant|GB|TB|MB|Fit|Style).*$/i,
    ''
  );

  // Step 8: final cleanup
  cleaned = cleaned.replace(/\s*online\s*$/i, '');
  cleaned = cleaned.replace(/\s+buy\s*$/i, '');
  cleaned = cleaned.replace(/\s+shop\s*$/i, '');
  cleaned = cleaned.replace(/\s*[-|:,@.]\s*$/g, ''); // trailing punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim(); // normalize spaces

  return cleaned && cleaned.length >= 3 ? cleaned : null;
}

/**
 * The og/meta/twitter title, cleaned of SEO junk. Central helper: the default
 * title extraction, the standard-scraper factory, and any bespoke brand all
 * pull the title from the same three metadata fields, differing only in the
 * brand-specific patterns they strip, so a scraper passes just its patterns
 * instead of respelling the field lookup.
 */
export function extractTitleFromMetadata(
  metadata: any,
  patterns?: RegExp[]
): string | null {
  const raw = metadata.ogTitle || metadata.title || metadata.twitterTitle;
  return raw ? cleanProductTitle(raw, patterns) : null;
}

/** Default image: the og:image if present, else the first product <img> in
    the html. Upgrades protocol-relative and http URLs to https. */
function defaultExtractImage(html: string, metadata: any): string | null {
  const og = metadata.ogImage || metadata.twitterImage;
  if (og) return toHttps(og);

  const imgMatch = html.match(
    /<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]+)"/i
  );
  if (imgMatch && imgMatch[1]) return toHttps(imgMatch[1]);

  return null;
}

/**
 * The canonical price from OpenGraph product metadata, the most reliable signal
 * a store can give: it is the live selling price, free of the strikethrough
 * MRP, EMI, and trade-in prose that litters the page body. Reads both the
 * og:price:* and product:price:* tag pairs (Firecrawl surfaces them raw and
 * camelCased), currency from the matching *:currency tag. Null when the page
 * emits neither. Central helper: the default extraction and the standard
 * scraper both prefer it before parsing any prose price.
 */
export function structuredPrice(metadata: any): ExtractedPrice {
  const amount =
    metadata['og:price:amount'] ||
    metadata.ogPriceAmount ||
    metadata['product:price:amount'] ||
    metadata.productPriceAmount;
  if (!amount) return null;

  const price = parseAmount(String(amount));
  if (isNaN(price) || price <= 0) return null;

  const currency = asSupportedCurrency(
    metadata['og:price:currency'] ||
      metadata.ogPriceCurrency ||
      metadata['product:price:currency'] ||
      metadata.productPriceCurrency
  );
  return { price, currency };
}

/** Default price: the structured metadata price first, then the first
    currency-prefixed price the matcher finds in the markdown, then the html.
    The matched symbol carries the currency. */
function defaultExtractPrice(
  html: string,
  markdown: string,
  metadata: any
): ExtractedPrice {
  const structured = structuredPrice(metadata);
  if (structured) return structured;

  const fromMarkdown = matchPrice(markdown);
  if (fromMarkdown) {
    return { price: fromMarkdown.price, currency: fromMarkdown.currency };
  }

  const fromHtml = matchAllPrices(html)[0];
  if (fromHtml) {
    return { price: fromHtml.price, currency: fromHtml.currency };
  }

  return null;
}

/** Normalize an image URL to https (protocol-relative // and http both). */
function toHttps(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
}
