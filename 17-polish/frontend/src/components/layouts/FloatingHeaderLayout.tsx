import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FloatingHeader from '../FloatingHeader';
import LoadingView from '../LoadingView';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import Colors from '../../constants/Colors';
import Opacity from '../../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../../constants/ScreenStyles';

interface FloatingHeaderLayoutProps {
  title: string;
  /** Renders a back button that pops the screen — pushed screens set it */
  showBack?: boolean;
  /** Right header content (action buttons) */
  headerRight?: React.ReactNode;
  /** Replaces the screen with the standard branded loading state */
  loading?: boolean;
  /**
   * The layout owns the ScrollView by default. Pass false when the screen
   * manages its own scroll container (a FlatList for a paginated feed). The
   * layout then renders children in a flex-1 View, and the screen must apply
   * the header clearance (Spacing.floatingHeaderContentPadding) and the
   * app-wide content edge (Spacing.contentHorizontal) on its list itself.
   */
  scroll?: boolean;
  /**
   * A node pinned above the bottom safe-area inset, floating over the scroll
   * content (a detail screen's call-to-action pill). The layout owns the
   * absolute positioning and centers it; the node passes taps through around
   * itself, so the content behind stays scrollable.
   */
  floatingFooter?: React.ReactNode;
  /**
   * A node docked at the foot of the screen, below the scroll content and above
   * the bottom safe-area inset (a form editor's pinned save CTA). Unlike
   * floatingFooter it is opaque, full-width, and carries a hairline top divider;
   * it stacks below the scroll in the safe-area column rather than floating over
   * it, so it never overlaps the content it submits.
   */
  pinnedFooter?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The screen scaffold: safe-area container + floating header + scrollable
 * content padded by Spacing.floatingHeaderContentPadding on top and
 * Spacing.scrollContentBottom below (the chrome-derived getters).
 * Screens provide content + header config only.
 *
 * SAFE-AREA INVARIANT: SafeAreaView pads normal children by the top inset,
 * so content starts at safeTop + floatingHeaderContentPadding; the header is
 * an absolute child that applies the same inset internally. Both measure
 * from the same reference — never add insets.top to content padding.
 */
const FloatingHeaderLayout: React.FC<FloatingHeaderLayoutProps> = ({
  title,
  showBack = false,
  headerRight,
  loading = false,
  scroll = true,
  floatingFooter,
  pinnedFooter,
  children,
}) => {
  const navigation = useAppNavigation();

  if (loading) {
    return <LoadingView />;
  }

  return (
    <SafeAreaView style={CommonScreenStyles.container} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={CommonScreenStyles.floatingHeaderContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}

      {pinnedFooter && <View style={styles.pinnedFooter}>{pinnedFooter}</View>}

      <FloatingHeader
        title={title}
        leftContent={
          showBack ? (
            // Not a HeaderIconButton: pulled to the screen edge, its
            // pressed-fill circle would clip off-screen — the back button
            // keeps the full tap target but presses with opacity instead
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={Opacity.pressed}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[CommonScreenStyles.center, styles.backButton]}
            >
              <Ionicons name="chevron-back" size={Spacing.chromeIconSize} color={Colors.dark} />
            </TouchableOpacity>
          ) : undefined
        }
        rightContent={headerRight}
      />

      {floatingFooter && (
        <View style={styles.floatingFooter} pointerEvents="box-none">
          {floatingFooter}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backButton: {
    width: Spacing.chromeTouchTarget,
    height: Spacing.chromeTouchTarget,
    marginLeft: Spacing.backChevronPull,
  },
  // Pinned above the bottom safe-area inset (absolute measures from the padding
  // box, so bottom sits clear of the inset SafeAreaView reserves).
  floatingFooter: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: Spacing.xl,
    alignItems: 'center',
  },
  // Docked below the scroll, above the bottom inset: an opaque bar carrying the
  // editor's save CTA, set off from the content by a hairline top divider.
  pinnedFooter: {
    paddingHorizontal: Spacing.contentHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
  },
});

export default FloatingHeaderLayout;
