import React from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';

/**
 * The floating glass surface all chrome pills share: BlurView on iOS,
 * near-opaque white on Android, fully rounded, chrome shadow. Callers own
 * the content layout inside it.
 */
export default function GlassPill({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return Platform.OS === 'ios' ? (
    <BlurView intensity={80} tint="light" style={[styles.pill, style]}>
      {children}
    </BlurView>
  ) : (
    <View style={[styles.pill, styles.androidPill, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.chrome,
  },
  androidPill: {
    backgroundColor: Colors.glassFallback,
  },
});
