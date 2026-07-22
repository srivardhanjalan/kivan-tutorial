import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface TileCaptionProps {
  children: string;
  /** Caption color override — the add tile's caption wears the brand accent */
  color?: string;
  numberOfLines?: number;
}

/**
 * The caption under an art tile — one composition for the whole tile family
 * (wishlist card, wish card, add tile) so their captions can't drift.
 */
const TileCaption: React.FC<TileCaptionProps> = ({
  children,
  color,
  numberOfLines = 2,
}) => (
  <Text
    style={[styles.caption, color !== undefined && { color }]}
    numberOfLines={numberOfLines}
  >
    {children}
  </Text>
);

const styles = StyleSheet.create({
  caption: {
    ...Typography.cardTitle,
    marginTop: Spacing.sm,
  },
});

export default TileCaption;
