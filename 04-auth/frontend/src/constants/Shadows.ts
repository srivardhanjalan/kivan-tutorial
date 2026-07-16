/** Elevation recipes. A shadow joins this file when a component first uses it. */
export default {
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
