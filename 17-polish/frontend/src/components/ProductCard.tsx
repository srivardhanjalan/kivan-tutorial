import React from 'react';
import { TouchableOpacity } from 'react-native';
import ImageForwardCard from './ImageForwardCard';
import GlassPricePill from './GlassPricePill';
import Opacity from '../constants/Opacity';
import type { Product } from '../services/api';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

/**
 * A catalog product as an image-forward tile — the same ImageForwardCard a wish
 * takes, since a product becomes a wish: the photo fills a rounded card and
 * sizes to its own aspect ratio (so a column staggers into a masonry), with a
 * glass price pill on the bottom and no caption (the name rides the a11y label).
 */
const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={product.name}
  >
    <ImageForwardCard imageUrl={product.image_url}>
      <GlassPricePill cost={product.price} />
    </ImageForwardCard>
  </TouchableOpacity>
);

export default ProductCard;
