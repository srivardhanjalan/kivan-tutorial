import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * The app's cover gradient: a diagonal (top-left → bottom-right) fill of the
 * parent, its stops resolved by the caller. The single LinearGradient the cover
 * band ({@link CoverPhoto}) and the tiles ({@link TileCoverFill}) both render,
 * so the gradient's direction lives in one place.
 */
export default function GradientFill({ colors }: { colors: readonly [string, string, string] }) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
