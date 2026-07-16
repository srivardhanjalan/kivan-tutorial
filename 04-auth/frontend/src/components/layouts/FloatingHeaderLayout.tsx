import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingHeader from '../FloatingHeader';
import LoadingView from '../LoadingView';
import { CommonScreenStyles, Spacing } from '../../constants/ScreenStyles';

interface FloatingHeaderLayoutProps {
  title?: string;
  /** Right header content (action buttons) */
  headerRight?: React.ReactNode;
  /** Replaces the screen with the standard branded loading state */
  loading?: boolean;
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
  headerRight,
  loading = false,
  children,
}) => {
  if (loading) {
    return <LoadingView />;
  }

  return (
    <SafeAreaView style={CommonScreenStyles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <FloatingHeader title={title} rightContent={headerRight} />
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
    // re-apply their own horizontal padding
    paddingHorizontal: Spacing.contentHorizontal,
  },
});

export default FloatingHeaderLayout;
