import React from 'react';
import { Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

interface HeaderIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  /** Extra content layered on the button (e.g. a badge) */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The standard icon button for the header's right glass pill. Every screen
 * uses this (share, filter, invite, ...) so action icons sit at the same
 * offset in the pill on every screen — the pill itself owns the padding.
 */
const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  icon,
  onPress,
  color = Colors.dark,
  children,
  style,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
  >
    <Ionicons name={icon} size={24} color={color} />
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: Spacing.chromeTouchTarget,
    height: Spacing.chromeTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.chromeTouchTarget / 2,
  },
  // Identical press feedback to FloatingHeaderTabs' active fill
  pressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default HeaderIconButton;
