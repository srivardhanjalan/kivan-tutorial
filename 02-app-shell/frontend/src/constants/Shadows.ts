/**
 * Reusable shadow definitions for consistent styling across the app.
 * These shadow presets ensure visual consistency and reduce code duplication.
 */

export const Shadows = {
  /**
   * Subtle shadow for minimal elevation (list items, subtle cards)
   * Use for: List items, subtle cards, inline elements
   */
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },

  /**
   * Card shadow for standard elevation (most cards)
   * Use for: Standard cards, modals, overlays
   */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  /**
   * Modal shadow for overlays and dialogs
   * Use for: Modal overlays, dropdowns, popovers
   */
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
};

export default Shadows;
