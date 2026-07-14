import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

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
  <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <Ionicons name={icon} size={24} color={Colors.dark} />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: Spacing.chromeTouchTarget,
    height: Spacing.chromeTouchTarget,
    borderRadius: Spacing.chromeTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default HeaderIconButton;
