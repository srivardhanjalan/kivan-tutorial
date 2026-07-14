/**
 * App identity — the single place that names this product.
 *
 * Swapping the domain (Notes, Trips, ...) starts here: change the name and
 * scheme, then replace the feature modules per MODULES.md. Keep `scheme` in
 * sync with app.json ("scheme") — deep links (`{scheme}://wishlist/...`) and
 * the share modals derive from this value.
 */
const AppConfig = {
  name: 'Kivan',
  /** Deep-link URL scheme (matches app.json `scheme`) */
  scheme: 'kivan',
  branding: {
    /** Brand mark used wherever the product shows its face */
    logo: require('../../assets/kivan.png'),
    /** The mark the animated loader spins — defaults to the logo; point it
        at a different asset to restyle every spinner at once */
    spinnerLogo: require('../../assets/kivan.png'),
  },
} as const;

export default AppConfig;
