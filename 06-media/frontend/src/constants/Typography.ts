import Colors from './Colors';

/**
 * Text inside fixed-height layouts (the header title row, CTA buttons) caps
 * Dynamic Type scaling so oversized accessibility fonts don't break them.
 * Free-flowing content text scales freely.
 * Usage: <Text maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier} ...>
 */
export const ChromeMaxFontSizeMultiplier = 1.2;

/**
 * Text style tokens. Spread into StyleSheet styles:
 *   title: { ...Typography.sectionTitle, marginBottom: 12 }
 * A style joins this file when a screen first uses it.
 */
export default {
  /** Screen titles in the floating header (30/700/-0.5) */
  largeTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: Colors.dark,
  },
  /** Section titles inside screens (20/700) */
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark,
  },
  /** Standout body copy (17/26) — onboarding descriptions, feature text */
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: Colors.dark,
  },
  /** CTA button labels (17/600, on filled surfaces) */
  button: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  /** Secondary body copy (15, muted) */
  bodySecondary: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  /** Emphasized compact text (15/600) — inline links, outlined-button labels */
  bodySecondaryStrong: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark,
  },
};
