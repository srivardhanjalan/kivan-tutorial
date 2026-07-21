import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
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
  /** True overlays that ride on top of photo and placeholder alike (the wish
      check badge, the add tile's plus) */
  children?: React.ReactNode;
}

/**
 * The one place the app turns a stored image URL into a clipped art block —
 * the wishlist tile, the wish tile, the add-new tile, and (via `height`) the
 * detail hero banner all share this exact shape, radius, and clip. When
 * `imageUrl` is set it renders full-bleed and the placeholder stays hidden;
 * children always render on top.
 */
const ArtTile: React.FC<ArtTileProps> = ({ color, imageUrl, height, placeholder, children }) => (
  <View
    style={[
      CommonScreenStyles.center,
      styles.tile,
      height ? { height } : styles.square,
      { backgroundColor: color },
    ]}
  >
    {imageUrl ? (
      <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      placeholder
    )}
    {children}
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
