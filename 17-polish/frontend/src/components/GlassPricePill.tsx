import React from 'react';
import { Text, StyleSheet } from 'react-native';
import GlassPill from './GlassPill';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { formatCost } from '../utils/formatCost';
import type { CurrencyCode } from '../constants/Currency';

interface GlassPricePillProps {
  cost: number | null;
  currency?: CurrencyCode | null;
}

/**
 * The blurred glass price pill riding the bottom of an image-forward tile,
 * shared by the wish and product cards so the price reads identically on both.
 * Renders nothing when there is no cost.
 */
const GlassPricePill: React.FC<GlassPricePillProps> = ({ cost, currency }) => {
  if (cost === null) return null;
  return (
    <GlassPill style={[CommonScreenStyles.center, styles.pricePill]}>
      <Text style={styles.priceText} numberOfLines={1}>
        {formatCost(cost, currency)}
      </Text>
    </GlassPill>
  );
};

const styles = StyleSheet.create({
  pricePill: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  priceText: {
    ...Typography.bodySecondaryStrong,
  },
});

export default GlassPricePill;
