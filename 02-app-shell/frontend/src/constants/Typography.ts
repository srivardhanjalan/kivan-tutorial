import { TextStyle } from 'react-native';
import Colors from './Colors';

/**
 * Cap for OS font scaling on text inside FIXED-HEIGHT chrome only
 * (header pill titles, tab bar labels, button labels). Content/body text
 * must NOT be capped — accessibility scaling keeps working there.
 * Usage: <Text maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier} ...>
 */
export const ChromeMaxFontSizeMultiplier = 1.2;

/**
 * App-wide text style tokens, derived from the dominant font usage in the
 * codebase (normalization, not a redesign). Spread into StyleSheet styles:
 *
 *   title: { ...Typography.sectionTitle, marginBottom: 12 }
 *
 * Sizes/weights reflect the most common existing combos:
 * 24/700 screen titles, 20/700 section titles, 13/700 muted group labels,
 * 14/600 form labels, 16/600 card titles, 16/400 body, 14/400 secondary,
 * 12/400 captions, 17/700 CTA buttons, 18/700 pill-header titles.
 */
export const Typography = {
  /** Large screen heading (24/700 dark) */
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark,
  },

  /** Floating pill header title (18/700 dark) */
  /** Open-content page title on top-level screens (mockup's "My Stuff") */
  largeTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: Colors.dark,
  },

  /** Prominent section title above content groups (20/700 dark) */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
  },

  /**
   * Muted small group label (13/700 muted grey) — the standard treatment
   * for section group labels ("ACCOUNT SETTINGS", "Web Stores (US)", ...).
   */
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  /** Form field / small emphasized label (14/600 near-black) */
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },

  /** Card / list item title (16/600 dark) */
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },

  /** Default body text (16/400 dark) */
  body: {
    fontSize: 16,
    color: Colors.dark,
  },

  /** Secondary body text (14/400 secondary grey) */
  bodySecondary: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  /** Small muted caption/meta text (12/400 muted grey) */
  caption: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  /** Primary CTA button label (17/700 white) */
  button: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
  },
} satisfies Record<string, TextStyle>;

export default Typography;
