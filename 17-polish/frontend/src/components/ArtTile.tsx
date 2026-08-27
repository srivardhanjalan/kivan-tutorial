import React from 'react';
import { View, StyleSheet } from 'react-native';
import TileCoverFill from './TileCoverFill';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles } from '../constants/ScreenStyles';

interface ArtTileProps {
  /** The tile's wash — a life-event pastel, or a neutral fill for placeholders */
  color: string;
  /** A stored image URL; when set it fills the block and children ride on top */
  imageUrl?: string | null;
  /** A fixed banner height (the detail hero); omitted, the block stays a 1:1 square */
  height?: number;
  /** The image-less fallback — the tile itself renders it only when there is
      no image, so that rule lives here, not at every call site */
  placeholder?: React.ReactNode;
}

/**
 * The one place the app turns a stored cover/image value into a clipped art
 * block — the tile family (the wishlist and add-new tiles) and (via `height`)
 * the detail hero banner both share this exact shape, radius, and clip. The
 * fill itself (a custom-upload image, a `preset:<id>` gradient, or the
 * placeholder) is delegated to {@link TileCoverFill}; this owns the square/
 * banner box and the pastel wash behind it.
 */
const ArtTile: React.FC<ArtTileProps> = ({ color, imageUrl, height, placeholder }) => (
  <View
    style={[
      CommonScreenStyles.center,
      styles.tile,
      height ? { height } : styles.square,
      { backgroundColor: color },
    ]}
  >
    <TileCoverFill coverPhoto={imageUrl} placeholder={placeholder} />
  </View>
);

const styles = StyleSheet.create({
  tile: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  // Default tile shape; a `height` overrides it for the wider detail hero
  square: {
    aspectRatio: 1,
  },
});

export default ArtTile;
