/**
 * Shared currency-aware price matcher.
 *
 * Scraped storefronts may quote prices in any of the currencies the app can
 * capture (see CurrencyCode in constants/Currency): INR ₹, USD $, GBP £,
 * EUR €, AED, SGD S$, AUD A$, CAD C$.
 *
 * All scraper price scans go through matchPrice/matchAllPrices so a price is
 * found regardless of which currency symbol the store uses, and so the
 * currency implied by the matched symbol is reported alongside the price.
 */

import type { CurrencyCode } from '../../constants/Currency';

export interface PriceMatch {
  /** Parsed numeric price (thousands separators stripped, decimals kept) */
  price: number;
  /** ISO currency code implied by the matched symbol/code, when unambiguous */
  currency?: CurrencyCode;
  /** Index of the match within the input text (for context slicing) */
  index: number;
  /** The full matched substring (currency token + amount) */
  raw: string;
}

/**
 * Currency token alternation. ORDER MATTERS: multi-character dollar symbols
 * (US$, S$, A$, C$) must be listed before the bare '$' so they are not
 * partially consumed as '$'.
 */
const CURRENCY_TOKEN_SOURCE =
  '₹|£|€|د\\.إ|US\\$|S\\$|A\\$|C\\$|\\$|\\bRs\\.?|\\b(?:INR|USD|GBP|EUR|AED|SGD|AUD|CAD)\\b';

/**
 * Amount: digits with optional comma AND/OR space (incl. NBSP) thousands
 * separators, with optional decimals.
 * Examples: "1,299" · "13 995.00" (Nike-style space separators) · "89.99"
 */
const AMOUNT_SOURCE = '[0-9](?:[0-9,\\u00A0 ]*[0-9])?(?:\\.[0-9]{1,2})?';

/** Full price pattern source (2 capture groups: 1 = currency token, 2 = amount). */
const PRICE_PATTERN_SOURCE = `(${CURRENCY_TOKEN_SOURCE})\\s*(${AMOUNT_SOURCE})`;

/** Fresh global regex over the shared price pattern */
function createPriceRegex(): RegExp {
  return new RegExp(PRICE_PATTERN_SOURCE, 'g');
}

/**
 * Explicit symbol/code → ISO currency mapping. A bare '$' maps to USD
 * (simple and explicit: ambiguous dollar defaults to the US store case).
 */
function currencyForToken(token: string): CurrencyCode | undefined {
  switch (token.trim().replace(/\.$/, '').toUpperCase()) {
    case '₹':
    case 'RS':
    case 'INR':
      return 'INR';
    case 'US$':
    case '$':
    case 'USD':
      return 'USD';
    case '£':
    case 'GBP':
      return 'GBP';
    case '€':
    case 'EUR':
      return 'EUR';
    case 'د.إ':
    case 'AED':
      return 'AED';
    case 'S$':
    case 'SGD':
      return 'SGD';
    case 'A$':
    case 'AUD':
      return 'AUD';
    case 'C$':
    case 'CAD':
      return 'CAD';
    default:
      return undefined;
  }
}

/**
 * Validate an arbitrary value (e.g. og:price:currency metadata) against the
 * supported currency codes. Returns undefined when unsupported/absent.
 */
export function asSupportedCurrency(value: unknown): CurrencyCode | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return currencyForToken(String(value));
}

/**
 * Parse an amount string: strip comma/space/NBSP thousands separators,
 * PRESERVE the decimal point.
 */
export function parseAmount(amount: string): number {
  return parseFloat(String(amount).replace(/[, \s]/g, ''));
}

/**
 * Find every currency-prefixed price in the text.
 */
export function matchAllPrices(text: string): PriceMatch[] {
  const out: PriceMatch[] = [];
  if (!text) return out;

  const regex = createPriceRegex();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const price = parseAmount(m[2]);
    if (isNaN(price) || price <= 0) continue;
    out.push({
      price,
      currency: currencyForToken(m[1]),
      index: m.index,
      raw: m[0],
    });
  }
  return out;
}

/**
 * Find the first currency-prefixed price in the text.
 *
 * @returns { price, currency?, index, raw } or null when no price is present.
 */
export function matchPrice(text: string): PriceMatch | null {
  const all = matchAllPrices(text);
  return all.length > 0 ? all[0] : null;
}
