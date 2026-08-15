/**
 * App identity as data — the jigsaw's swap point. Entries join when code
 * first consumes them, never in advance: the native name/scheme live only
 * in app.json until a screen or deep link reads them here.
 */
const AppConfig = {
  /** The deep-link URL scheme, kept in sync with app.json's `scheme`. Step 14
      is the first code to read it: the share modals build `{scheme}://wishlist/`
      links and Navigation's parser matches the same prefix, so the one string
      that names how the app opens lives here once. */
  scheme: 'kivan',
  branding: {
    /** The brand mark — the loader spins it, the auth screens crown their
        forms with it. Point it at your own asset to rebrand both at once. */
    logo: require('../../assets/kivan.png'),
    /** The mark's display size wherever it appears full-size */
    logoSize: 120,
  },
  /** The DEFAULT cost symbol: what a cost with no captured currency reads in
      (a catalog product, a manually-entered wish). Step 09 captures a per-wish
      currency from scraped stores and displays each cost in its own symbol
      (see constants/Currency.ts); this stays the fallback for costs that carry
      none. A per-user display currency plus live conversion is a later concern.
      Every default-currency adornment reads this, so that swap lands once. */
  currencySymbol: '₹',
} as const;

export default AppConfig;
