import React from 'react';
import ArtTileCard from './ArtTileCard';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';
import { formatCost } from '../utils/formatCost';
import type { Product } from '../services/api';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

/**
 * A catalog product as a tile (the shared ArtTileCard): the same art block,
 * caption, and cost line as a wish card, since a product becomes a wish. The
 * product photo fills the art block (a placeholder glyph stands in when it has
 * none); name and price sit below.
 */
const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => (
  <ArtTileCard
    title={product.name}
    onPress={onPress}
    color={Colors.subtleFill}
    imageUrl={product.image_url}
    placeholder={<ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />}
    subtitle={formatCost(product.price)}
  />
);

export default ProductCard;
