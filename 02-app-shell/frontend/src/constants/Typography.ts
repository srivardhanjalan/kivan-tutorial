import Colors from './Colors';

/**
 * Chrome text (header titles/actions, tab labels) caps Dynamic Type scaling
 * so oversized accessibility fonts don't break pill layouts. Content text
 * scales freely.
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
  /** Muted uppercase-ish group labels (13/700) */
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  /** Default body text (16/400) */
  body: {
    fontSize: 16,
    color: Colors.dark,
  },
};
