import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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
  children,
}) => {
  const navigation = useAppNavigation();

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
  scrollContent: {
    paddingTop: Spacing.floatingHeaderContentPadding,
    paddingBottom: Spacing.scrollContentBottom,
    // The layout owns the single app-wide content edge; screens must not
    // re-apply their own horizontal padding
    paddingHorizontal: Spacing.contentHorizontal,
  },
});

export default FloatingHeaderLayout;
