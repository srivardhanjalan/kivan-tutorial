import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { Storefront } from '../services/api';

interface StorefrontCardProps {
  storefront: Storefront;
  onPress: () => void;
}

/**
 * A curated store as an image-forward card: the store's logo fills the top of a
 * rounded card (a placeholder glyph when it has none), with the name, an
 * optional description, and a product-count pill below. Two of these ride a row
 * in the Wish Store grid, replacing the old catalog row.
 */
const StorefrontCard: React.FC<StorefrontCardProps> = ({ storefront, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={storefront.name}
    style={styles.card}
  >
    {storefront.logo_url ? (
      <Image source={{ uri: storefront.logo_url }} style={styles.logo} resizeMode="cover" />
    ) : (
      <View style={[styles.logo, styles.placeholder]}>
        <ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />
      </View>
    )}
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={2}>
        {storefront.name}
      </Text>
      {storefront.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {storefront.description}
        </Text>
      ) : null}
      <View style={styles.countRow}>
        <Ionicons name="pricetag-outline" size={14} color={Colors.primary} />
        <Text style={styles.countText}>{storefront.product_count}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  logo: {
    width: '100%',
    aspectRatio: 1.4,
  },
  placeholder: {
    ...CommonScreenStyles.center,
    backgroundColor: Colors.subtleFill,
  },
  info: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.bodySecondaryStrong,
  },
  description: {
    ...Typography.bodySecondary,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  countText: {
    ...Typography.bodySecondaryStrong,
    color: Colors.primary,
  },
});

export default StorefrontCard;
