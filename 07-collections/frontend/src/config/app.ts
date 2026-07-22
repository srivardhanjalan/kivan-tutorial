/**
 * App identity as data — the jigsaw's swap point. Entries join when code
 * first consumes them, never in advance: the native name/scheme live only
 * in app.json until a screen or deep link reads them here.
 */
const AppConfig = {
  branding: {
    /** The brand mark — the loader spins it, the auth screens crown their
        forms with it. Point it at your own asset to rebrand both at once. */
    logo: require('../../assets/kivan.png'),
    /** The mark's display size wherever it appears full-size */
    logoSize: 120,
  },
  /** The single currency wishes are priced in. One symbol for the whole app
      until step 09 brings per-user currency (a picker + conversion); every
      cost adornment reads this so that swap has one place to land. */
  currencySymbol: '₹',
} as const;

export default AppConfig;
