import React from 'react';
import { Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { Brand } from '../services/api';

interface BrandLogoCardProps {
  brand: Brand;
  /** Cell width the wall computed off the window, so tiles are exact squares. */
  width: number;
  onPress: () => void;
}

/**
 * One brand in the logo wall: a square tile centering the brand's mark, or the
 * brand's name when it has no logo. The image-forward replacement for the
 * directory row's small logo, tiled several to a row.
 */
const BrandLogoCard: React.FC<BrandLogoCardProps> = ({ brand, width, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={brand.name}
    style={[CommonScreenStyles.center, styles.tile, { width }]}
  >
    {brand.logo_url ? (
      <Image source={{ uri: brand.logo_url }} style={styles.logo} resizeMode="contain" />
    ) : (
      <Text style={styles.fallback} numberOfLines={2} adjustsFontSizeToFit>
        {brand.name}
      </Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.card,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    ...Typography.bodySecondaryStrong,
    textAlign: 'center',
  },
});

export default BrandLogoCard;
