import { CURRENCY_SYMBOLS, DEFAULT_CURRENCY_SYMBOL } from '../constants/Currency';
import type { CurrencyCode } from '../constants/Currency';

/**
 * A cost as a display string: the right currency symbol on a grouped integer
 * (₹1,299 · $89 · AED 1,299). Every surface that shows a cost renders it this
 * way, so the formatting lives here and cannot drift between them. Rounds to
 * whole units, matching the symbols' no-decimals default.
 *
 * `currency` is the code a browser scrape captured onto the wish; a cost with
 * none (a catalog product, a manually-entered wish) passes nothing and reads
 * in the app default symbol. Step 09 shows each cost in its OWN currency: no
 * conversion, no per-user display currency.
 */
export function formatCost(cost: number, currency?: CurrencyCode | null): string {
  const symbol = currency ? CURRENCY_SYMBOLS[currency] : DEFAULT_CURRENCY_SYMBOL;
  return `${symbol}${Math.round(cost).toLocaleString()}`;
}
