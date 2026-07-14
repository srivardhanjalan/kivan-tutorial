import { StyleSheet } from 'react-native';
import Colors from './Colors';
import Typography from './Typography';

/**
 * Common spacing constants used across all screens
 */
export const Spacing = {
  // Base spacing scale — use these for paddings/margins/gaps instead of magic numbers
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Horizontal padding for content sections
  contentHorizontal: 12,

  // ── Unified chrome dimensions ──────────────────────────────────────────
  // Single source of truth for ALL top headers and the bottom tab bar so
  // every screen's chrome lines up (same pill height top and bottom).
  chromePillHeight: 60,        // header pills AND bottom tab-bar pills
  chromePillPadding: 6,        // vertical padding inside header/tab pills
  // Inner height available for buttons/tabs inside a pill (60 − 2×6 = 48)
  get chromePillInnerHeight() {
    return this.chromePillHeight - 2 * this.chromePillPadding;
  },
  // Bottom tab bar (same pill height as headers by design)
  get tabBarHeight() {
    return this.chromePillHeight;
  },
  tabBarBottomMargin: 16,      // gap between the tab bar and the screen bottom
  tabBarContentGap: 22,        // breathing room between content end and tab bar

  // Chrome icon standards — one size per slot, applied everywhere
  tabIconSize: 34,             // bottom tab-bar icons (incl. browser controls)
  backChevronSize: 28,         // header back chevron
  chromeTouchTarget: 44,       // minimum tap target for chrome buttons

  // Bottom padding for scrollable content (accounts for bottom navigation)
  get scrollContentBottom() {
    return this.tabBarHeight + this.tabBarBottomMargin + this.tabBarContentGap; // 60 + 16 + 22 = 98
  },

  // Floating header positioning
  // Legacy alias — header pill height now comes from chromePillHeight
  get floatingHeaderHeight() {
    return this.chromePillHeight;
  },
  floatingHeaderContentGap: 12, // Gap between floating header and content below it

  // Calculated: Total padding needed for content below floating headers
  get floatingHeaderContentPadding() {
    return this.floatingHeaderHeight + this.floatingHeaderContentGap; // 60 + 12 = 72
  },
};

/**
 * Common screen styles that can be reused across all screens
 */
export const CommonScreenStyles = StyleSheet.create({
  // Main container for screens
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Auth container (white background)
  authContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // Content section with horizontal padding
  contentSection: {
    paddingHorizontal: 12,
  },

  // Empty state container
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  // Empty state text
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 16,
  },
});

/**
 * Common modal styles
 */
export const CommonModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 28,
    width: '88%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 10,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 0,
    textAlign: 'left',
    letterSpacing: -0.5,
    flex: 1,
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Common floating glass header styles for screens
 * Used by AddWishScreen, ConnectionsScreen, MyStuffScreen, etc.
 */
/**
 * Common avatar styles with size variants
 */
export const AvatarStyles = {
  // Large avatar (120x120) - HomeScreen
  large: StyleSheet.create({
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 5,
      borderColor: Colors.white,
      backgroundColor: Colors.grey,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 12,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 5,
      borderColor: Colors.white,
      backgroundColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 12,
    },
  }),

  // Medium avatar (110x110) - UserProfileScreen
  medium: StyleSheet.create({
    avatar: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: Colors.grey,
      borderWidth: 5,
      borderColor: Colors.white,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 10,
    },
    avatarContainer: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 5,
      borderColor: Colors.white,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 10,
    },
  }),

  // Small avatar (60x60) - DiscoverScreen
  small: StyleSheet.create({
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      overflow: 'hidden',
      backgroundColor: Colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    avatarPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: Colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  }),
};

/**
 * Common profile section styles (for screens with cover photo + avatar)
 */
export const CommonProfileStyles = StyleSheet.create({
  // Large avatar (120x120) - overlaps cover photo
  avatarLarge: {
    marginTop: -55,
    borderWidth: 5,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },

  // Medium avatar (110x110) - overlaps cover photo
  avatarMedium: {
    marginTop: -55,
    borderWidth: 5,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
});

