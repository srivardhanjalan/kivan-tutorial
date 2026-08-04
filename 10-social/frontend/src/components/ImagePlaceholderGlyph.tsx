import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

/**
 * The image-less fallback for a photo slot: a grey outline image mark.
 * Any photo slot with no image raises it (the wish and product cards, the wish
 * and product detail heroes, the upload field's empty slot); only the glyph
 * size differs. (WishlistPlaceholderGlyph is the wishlist twin, where a life
 * event's emoji leads instead.)
 */
const ImagePlaceholderGlyph: React.FC<{ size: number }> = ({ size }) => (
  <Ionicons name="image-outline" size={size} color={Colors.grey} />
);

export default ImagePlaceholderGlyph;
