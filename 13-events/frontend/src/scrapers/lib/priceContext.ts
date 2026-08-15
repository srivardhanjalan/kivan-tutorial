/**
 * Shared price-noise-context filter.
 *
 * A currency-prefixed number on a product page is not always the product's own
 * price: it can sit in a cart total, a shipping or delivery line, a coupon, or
 * a financing offer. Both the standard scraper and a bespoke one (apple.ts)
 * scan for a price and then reject the ones sitting next to such words. The
 * window and the shared term set live here so the two do not drift apart; each
 * caller adds the extra terms its store needs (the standard scraper adds
 * "delivery", Apple adds its financing vocabulary).
 */

/** Words whose presence beside a price means it is not the product's own. */
const NOISE_TERMS = ['minimum', 'cart', 'shipping', 'coupon', 'save', 'offer'];

/** Monthly-instalment units (EMI / "per month" financing). Checked as a tight
    suffix on the matched amount, never through the window: an EMI line sits
    right beside the real price ("From ₹12199.00/mo. ... or ₹69900.00"), so a
    ±60 window flags BOTH and throws the real price away with the instalment. */
const INSTALMENT_UNITS = ['/mo', '/month', 'per month'];

/** The lowercased ±60 chars around a matched price, for the noise check. */
export function priceContext(text: string, index: number, matchLength: number): string {
  return text
    .substring(Math.max(0, index - 60), index + matchLength + 60)
    .toLowerCase();
}

/** True when the matched amount is itself a monthly instalment: an EMI unit
    ("/mo", "per month") follows immediately after it. Tighter than the window
    check on purpose, so an EMI figure beside the real price disqualifies only
    itself, not the price next to it. */
export function isInstalmentAmount(text: string, index: number, matchLength: number): boolean {
  const after = text.substring(index + matchLength, index + matchLength + 12).toLowerCase().trimStart();
  return INSTALMENT_UNITS.some((unit) => after.startsWith(unit));
}

/** True when the price sits next to a noise word: the shared set, plus any
    extra terms the caller's store needs. */
export function isNoisePriceContext(context: string, extraTerms: string[] = []): boolean {
  return (
    NOISE_TERMS.some((term) => context.includes(term)) ||
    extraTerms.some((term) => context.includes(term))
  );
}
