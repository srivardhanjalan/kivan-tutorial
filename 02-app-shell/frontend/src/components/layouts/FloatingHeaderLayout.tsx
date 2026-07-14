import React from 'react';
import {
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingHeader from '../FloatingHeader';
import LoadingView from '../LoadingView';
import { CommonScreenStyles, Spacing } from '../../constants/ScreenStyles';

export interface FloatingHeaderLayoutProps {
  /** Header title (ignored when headerLeft is provided) */
  title?: string;
  /** Back chevron in the header; presence renders the button */
  onBackPress?: () => void;
  /** Custom left header content (takes precedence over title) */
  headerLeft?: React.ReactNode;
  /** Right header content (right pill in split layout) */
  headerRight?: React.ReactNode;
  /** Pill arrangement (default 'single'; detail screens use 'split') */
  headerLayout?: 'single' | 'split';
  /** Hide the header entirely (e.g. while a fullscreen sub-view is shown) */
  hideHeader?: boolean;
  /** Style override for the header's outer container */
  headerContainerStyle?: StyleProp<ViewStyle>;
  /**
   * When true, replaces the whole screen with the standard LoadingView
   * (matches the app-wide early-return loading pattern).
   */
  loading?: boolean;
  loadingMessage?: string;
  /**
   * Layout owns the ScrollView by default. Pass false when the screen
   * manages its own scroll container (FlatList etc.) — the layout then
   * renders children in a flex-1 View and the screen must apply
   * Spacing.floatingHeaderContentPadding AND the app-wide content edge
   * (paddingHorizontal: Spacing.contentHorizontal) itself.
   */
  scroll?: boolean;
  /** Standard RefreshControl, forwarded to the owned ScrollView */
  refreshControl?: React.ReactElement<any>;
  /** Wrap content in KeyboardAvoidingView (form screens) */
  keyboardAvoiding?: boolean;
  /** Extra styles merged over the standard content padding */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Forwarded to the owned ScrollView (e.g. keyboardShouldPersistTaps) */
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** Content rendered above the header (dropdowns, overlays, modals, FABs) */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard screen scaffold: SafeArea container + floating glass pill header +
 * scrollable content with the app-wide top clearance (84) and bottom-nav
 * padding (110). Screens provide content + header config only.
 */
const FloatingHeaderLayout: React.FC<FloatingHeaderLayoutProps> = ({
  title,
  onBackPress,
  headerLeft,
  headerRight,
  headerLayout = 'single',
  hideHeader = false,
  headerContainerStyle,
  loading = false,
  loadingMessage,
  scroll = true,
  refreshControl,
  keyboardAvoiding = false,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  overlay,
  children,
}) => {
  if (loading) {
    return <LoadingView message={loadingMessage} />;
  }

  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  // SAFE-AREA INVARIANT (do not break — this exact mismatch caused a past bug):
  // - SafeAreaView (react-native-safe-area-context, works on iOS AND Android)
  //   pads NORMAL children by the top/bottom insets, so scroll content starts
  //   at safeTop + Spacing.floatingHeaderContentPadding (84).
  // - FloatingHeader is an ABSOLUTE child with an explicit `top: insets.top`
  //   set internally; explicit-position absolute children measure from the
  //   container's UNPADDED frame, so the pill also lands at safeTop.
  // => Header (safeTop..safeTop+72) and content (safeTop+84) share the same
  //    reference on both platforms, leaving the standard 12px gap. Never add
  //    insets.top to content padding, and never move the header to top: 0.
  return (
    <SafeAreaView style={CommonScreenStyles.container} edges={['top', 'bottom']}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}

      {!hideHeader && (
        <FloatingHeader
          title={title}
          onBackPress={onBackPress}
          leftContent={headerLeft}
          rightContent={headerRight}
          layout={headerLayout}
          containerStyle={headerContainerStyle}
        />
      )}

      {overlay}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.floatingHeaderContentPadding,
    paddingBottom: Spacing.scrollContentBottom,
    // The layout owns the single app-wide content edge; screens must not
    // re-apply their own horizontal padding. Full-bleed rails opt out with
    // marginHorizontal: -Spacing.contentHorizontal.
    paddingHorizontal: Spacing.contentHorizontal,
  },
});

export default FloatingHeaderLayout;
