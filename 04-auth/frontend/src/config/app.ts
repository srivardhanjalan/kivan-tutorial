/**
 * App identity as data — the jigsaw's swap point. Entries join when code
 * first consumes them, never in advance: the native name/scheme live only
 * in app.json until a screen or deep link reads them here (they arrive
 * with auth and sharing in later steps).
 */
const AppConfig = {
  branding: {
    /** The mark the animated loader spins — point it at your own asset to
        restyle every spinner at once */
    spinnerLogo: require('../../assets/kivan.png'),
  },
} as const;

export default AppConfig;
