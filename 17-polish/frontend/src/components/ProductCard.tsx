import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GlassPill from './GlassPill';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { formatCost } from '../utils/formatCost';
import type { Product } from '../services/api';

/** Until the photo loads (and for a product with none) the tile holds this
    portrait ratio, matching the wishes collection look. */
const DEFAULT_ASPECT = 0.75;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

/**
 * A catalog product as an image-forward tile — the same shape a WishCard takes,
 * since a product becomes a wish: the photo fills a rounded card and sizes to
 * its own aspect ratio so a column of these staggers into a masonry, with a
 * blurred glass price pill riding the bottom. A placeholder glyph stands in when
 * the product has no photo. No caption — the name rides the accessibility label.
 */
const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <View style={styles.card}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={[styles.image, { aspectRatio }]}
            resizeMode="cover"
            onLoad={({ nativeEvent: { source } }) => {
              if (source?.width && source?.height) setAspectRatio(source.width / source.height);
            }}
          />
        ) : (
          <View style={[styles.image, styles.placeholder, { aspectRatio: DEFAULT_ASPECT }]}>
            <ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />
          </View>
        )}

        <GlassPill style={[CommonScreenStyles.center, styles.pricePill]}>
          <Text style={styles.priceText} numberOfLines={1}>
            {formatCost(product.price)}
          </Text>
        </GlassPill>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  image: {
    width: '100%',
  },
  placeholder: {
    ...CommonScreenStyles.center,
    backgroundColor: Colors.subtleFill,
  },
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

export default ProductCard;
