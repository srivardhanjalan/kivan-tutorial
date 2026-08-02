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

/** The lowercased ±60 chars around a matched price, for the noise check. */
export function priceContext(text: string, index: number, matchLength: number): string {
  return text
    .substring(Math.max(0, index - 60), index + matchLength + 60)
    .toLowerCase();
}

/** True when the price sits next to a noise word: the shared set, plus any
    extra terms the caller's store needs. */
export function isNoisePriceContext(context: string, extraTerms: string[] = []): boolean {
  return (
    NOISE_TERMS.some((term) => context.includes(term)) ||
    extraTerms.some((term) => context.includes(term))
  );
}
