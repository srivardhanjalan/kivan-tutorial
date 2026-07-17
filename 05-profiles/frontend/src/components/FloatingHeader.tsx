import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';
import Typography, { ChromeMaxFontSizeMultiplier } from '../constants/Typography';

// Colors.background at descending opacities. Never fully opaque — scrolled
// content stays visible under the title, just lighter (the Apple large-title
// treatment). Alpha-of-background, not 'transparent', which fades through
// black on iOS.
const wash = (alpha: number) => `rgba(${Colors.backgroundRgb}, ${alpha})`;

interface FloatingHeaderProps {
  title?: string;
  /** Content before the title — the back button on pushed screens */
  leftContent?: React.ReactNode;
  /** Content on the right — header action buttons */
  rightContent?: React.ReactNode;
}

/**
 * One header language everywhere: content scrolling up stays visible but
 * reads progressively lighter as it passes behind the title and buttons —
 * a translucent wash confined to the header's own footprint, reaching zero
 * exactly at the row's bottom edge. No block, no tail, no edge below.
 * The title lands on the left content edge; the right buttons' pressed
 * fill ends on the right content edge.
 */
const FloatingHeader: React.FC<FloatingHeaderProps> = ({ title, leftContent, rightContent }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.headerBar} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={[wash(0.92), wash(0.8), wash(0)]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.row, { marginTop: insets.top }]}>
        {leftContent}
        <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier}>
          {title}
        </Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Spacing.chromePillHeight,
    paddingHorizontal: Spacing.contentHorizontal,
  },
  title: {
    ...Typography.largeTitle,
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // The pressed fill circle is the visible boundary of these buttons, so
    // the BUTTON edge (not the glyph) sits on the content edge
  },
});

export default FloatingHeader;
