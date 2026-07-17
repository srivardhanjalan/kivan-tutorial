import Colors from './Colors';

/** The lift under filled CTAs — tinted per variant below */
const ctaLift = {
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 4,
};

/** Elevation recipes. A shadow joins this file when a component first uses it. */
export default {
  /** The brand-tinted lift under filled CTAs */
  cta: {
    ...ctaLift,
    shadowColor: Colors.primary,
  },
  /** The same lift, danger-tinted — destructive CTAs */
  ctaDanger: {
    ...ctaLift,
    shadowColor: Colors.danger,
  },
  /** The floating chrome pills (tab bar) */
  chrome: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 8,
  },
  /** Floating overlays (toasts, modals) */
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
};
