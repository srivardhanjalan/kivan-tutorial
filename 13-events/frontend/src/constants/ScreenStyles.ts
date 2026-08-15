import { StyleSheet } from 'react-native';
import Colors from './Colors';
import BorderRadius from './BorderRadius';
import Opacity from './Opacity';

/**
 * Spacing + chrome metrics. The chrome numbers are a single source of truth
 * for ALL headers and the tab bar, so every screen's chrome lines up.
 * A value joins when a component first uses it, never in advance.
 */
export const Spacing = {
  // The hairline gap under a primary line before its muted second line: a
  // tile's subtitle, a user row's, a profile stat's label. Sub-scale on
  // purpose (tighter than xs), and shared, so it's a token, not a literal.
  hairlineGap: 2,
  // The tight sub-scale step: a pill's inner padding and a store card's
  // name/blurb/count gaps all want this same 4pt
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  /** The app-wide content edge — everything aligns to this */
  contentHorizontal: 12,

  // ── Chrome ────────────────────────────────────────────────────────────
  chromePillHeight: 60,   // header row AND bottom tab-bar pills
  chromePillPadding: 6,   // vertical padding inside tab pills
  /** Inner height for buttons/tabs inside a pill (60 − 2×6 = 48) */
  get chromePillInnerHeight() {
    return this.chromePillHeight - 2 * this.chromePillPadding;
  },
  tabBarBottomMargin: 16, // gap between the tab bar and the screen bottom
  tabBarContentGap: 22,   // breathing room between content end and tab bar
  tabIconSize: 34,        // bottom tab-bar icons
  chromeIconSize: 24,     // header action icons
  chromeTouchTarget: 44,  // minimum tap target for chrome buttons
  /** The chevron stroke starts ~7pt inside its glyph box */
  chevronGlyphInset: 7,
  /** Pulls the back button left so the chevron's VISIBLE TIP (glyph box
      centering + the stroke's internal inset) lands on the content edge,
      aligned with every section header below it */
  get backChevronPull() {
    return -((this.chromeTouchTarget - this.chromeIconSize) / 2) - this.chevronGlyphInset;
  },

  /** Bottom padding for scrollable content (clears the floating tab bar) */
  get scrollContentBottom() {
    return this.chromePillHeight + this.tabBarBottomMargin + this.tabBarContentGap; // 98
  },

  /** The art-block height at the top of a detail screen (the wish, wishlist,
      and product heroes share it, so the detail screens stay visually aligned) */
  detailHeroHeight: 180,
  detailHeroGlyphSize: 64, // placeholder glyph in a detail hero (emoji + Ionicons)
  tileGlyphSize: 40,       // placeholder glyph in a tile-sized slot (cards, add tile, upload field)

  floatingHeaderContentGap: 12,
  /** Top padding for content under the floating header (60 + 12 = 72) */
  get floatingHeaderContentPadding() {
    return this.chromePillHeight + this.floatingHeaderContentGap;
  },
};

export const CommonScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  /** The centering idiom — compose via style arrays instead of repeating it */
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The app-wide raised outlined surface — form fields, OAuth buttons,
      prompt cards */
  outlinedSurface: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  /** The same outlined surface as a fully-rounded pill: the quiet idle chip
      (life-event selector) and the love button share it. Callers add their own
      padding and layout; this owns only the surface, border, and round. */
  outlinedPill: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  /** The one dim every button in flight wears: composed in with `loading && `.
      One spelling of "this control is busy/disabled", the CTA, OAuth, follow,
      love, and tile cards all share. */
  dimmed: {
    opacity: Opacity.disabled,
  },
});
