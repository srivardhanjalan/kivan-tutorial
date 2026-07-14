import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface HeaderIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

/**
 * The standard header action: a 44pt tap target whose grey pressed fill is
 * the visible affordance. Every screen's right-side header buttons are this
 * component, so they all look and align identically.
 */
const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({ icon, onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [CommonScreenStyles.center, styles.button, pressed && styles.pressed]}>
    <Ionicons name={icon} size={24} color={Colors.dark} />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: Spacing.chromeTouchTarget,
    height: Spacing.chromeTouchTarget,
    borderRadius: BorderRadius.full,
  },
  pressed: {
    backgroundColor: Colors.pressedFill,
  },
});

export default HeaderIconButton;
