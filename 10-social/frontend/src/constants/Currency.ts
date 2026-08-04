import AppConfig from '../config/app';

/**
 * The currencies a scraped price can arrive in. This is exactly the set the
 * price matcher (scrapers/lib/priceMatcher.ts) detects from a store's page:
 * no more, no less. A wish captured from a browsed store carries one of these
 * codes; a manual or catalog wish carries none and reads in the app default.
 *
 * There is deliberately NO per-user display currency, NO conversion, and NO
 * exchange-rate table here: step 09 CAPTURES and DISPLAYS each cost in its own
 * source currency. A picker plus live conversion is a later concern (and it
 * would be dishonest to ship hardcoded, stale rates in the meantime).
 */
export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'AED'
  | 'SGD'
  | 'AUD'
  | 'CAD';

/**
 * The symbol each code renders with, prefixed onto the amount by formatCost.
 * The dollar family is disambiguated (S$/A$/C$) so a Singapore price never
 * reads as a US one; AED has no single glyph, so its ISO code prefixes the
 * amount ("AED 1,299"). These mirror the tokens currencyForToken maps FROM,
 * so a captured code round-trips back to the symbol it was scraped as.
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AED: 'AED ',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
};

/** The symbol a cost with no captured currency reads in: the app default,
    so catalog and manually-entered costs keep the single-currency look. */
export const DEFAULT_CURRENCY_SYMBOL = AppConfig.currencySymbol;
