import { StyleSheet } from 'react-native';
import Colors from './Colors';
import BorderRadius from './BorderRadius';

/**
 * Spacing + chrome metrics. The chrome numbers are a single source of truth
 * for ALL headers and the tab bar, so every screen's chrome lines up.
 * A value joins when a component first uses it, never in advance.
 */
export const Spacing = {
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
  chromeTouchTarget: 44,  // minimum tap target for chrome buttons

  /** Bottom padding for scrollable content (clears the floating tab bar) */
  get scrollContentBottom() {
    return this.chromePillHeight + this.tabBarBottomMargin + this.tabBarContentGap; // 98
  },

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
  /** The auth form's raised outlined element — text fields and OAuth buttons */
  outlinedSurface: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
});
