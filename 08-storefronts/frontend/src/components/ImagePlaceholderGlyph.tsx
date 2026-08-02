import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

/**
 * The image-less fallback for a photo slot: a grey outline image mark.
 * The wish tile, the wish detail hero, and the upload field's empty slot all
 * raise it — only the glyph size differs. (WishlistPlaceholderGlyph is the
 * wishlist twin, where a life event's emoji leads instead.)
 */
const ImagePlaceholderGlyph: React.FC<{ size: number }> = ({ size }) => (
  <Ionicons name="image-outline" size={size} color={Colors.grey} />
);

export default ImagePlaceholderGlyph;
