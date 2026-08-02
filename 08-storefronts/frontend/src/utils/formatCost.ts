import AppConfig from '../config/app';

/**
 * A wish's cost as a display string — the app's single currency symbol on a
 * grouped integer (₹1,299). Every surface that shows a cost renders it this
 * way (the wish and product cards, the wish and product details), so the
 * formatting lives here and cannot drift between them. Rounds to whole units,
 * matching the symbol's no-decimals default.
 */
export function formatCost(cost: number): string {
  return `${AppConfig.currencySymbol}${Math.round(cost).toLocaleString()}`;
}
