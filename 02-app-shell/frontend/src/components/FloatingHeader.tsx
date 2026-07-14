import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';
import Typography, { ChromeMaxFontSizeMultiplier } from '../constants/Typography';

// Colors.background (#FDFFFF) at descending opacities. Never fully opaque —
// scrolled content stays visible under the title, just lighter (the Apple
// large-title treatment). Alpha-of-background, not 'transparent', which
// fades through black on iOS.
const wash = (alpha: number) => `rgba(253, 255, 255, ${alpha})`;

export interface FloatingHeaderProps {
  /**
   * Header title text
   */
  title?: string;

  /**
   * Optional callback for back button press
   */
  onBackPress?: () => void;

  /**
   * Content to display on the left side of header
   * Takes precedence over title if both provided
   */
  leftContent?: React.ReactNode;

  /**
   * Content to display on the right side of header
   */
  rightContent?: React.ReactNode;

  /**
   * Layout mode:
   * - 'single': Single pill with all content
   * - 'split': Two pills (left and right)
   */
  layout?: 'single' | 'split';

  /**
   * Custom container style
   */
  containerStyle?: any;
}

const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  title,
  onBackPress,
  leftContent,
  rightContent,
  layout = 'single',
  containerStyle,
}) => {
  const insets = useSafeAreaInsets();

  const renderBackButton = () => (
    <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
      <Ionicons name="chevron-back" size={Spacing.backChevronSize} color={Colors.dark} />
    </TouchableOpacity>
  );

  const renderTitle = () => (
    <Text
      style={[styles.title, layout === 'split' && { flex: 1 }]}
      numberOfLines={1}
      maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier}
    >
      {title}
    </Text>
  );

  // One header language everywhere: content scrolling up stays visible but
  // reads progressively lighter as it passes behind the title and buttons —
  // a translucent wash confined to the header's own footprint, reaching zero
  // exactly at the row's bottom edge. No block, no tail, no edge below.
  // Title and actions sit bare on it — glyphs land exactly on the left and
  // right content edges; the pressed grey fill is the action affordance.
  return (
    <View style={[styles.headerBar, containerStyle]} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={[wash(0.92), wash(0.8), wash(0)]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.row, { marginTop: insets.top }]}>
        <View style={styles.leftBare}>
          {onBackPress && renderBackButton()}
          {leftContent || (title && renderTitle())}
        </View>

        {rightContent && <View style={styles.rightActions}>{rightContent}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // The pressed/active fill circle is the visible boundary of these
    // buttons, so the BUTTON edge (not the glyph) sits on the content edge
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Spacing.chromePillHeight,
    paddingHorizontal: Spacing.contentHorizontal,
  },
  leftBare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: Spacing.chromePillHeight,
  },
  title: {
    ...Typography.largeTitle,
  },
  backButton: {
    // Full-size tap target, but pulled left so the chevron GLYPH (centered
    // inside it) sits on the content edge, aligned with the screen's content
    width: Spacing.chromeTouchTarget,
    height: Spacing.chromeTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -((Spacing.chromeTouchTarget - Spacing.backChevronSize) / 2) - 2,
    marginRight: 0,
  },
});

export default React.memo(FloatingHeader);
