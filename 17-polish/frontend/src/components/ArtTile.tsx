import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BorderRadius from '../constants/BorderRadius';
import { tileCover } from '../constants/DefaultCoverPhotos';
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
 * value is classified through the shared {@link tileCover}: a custom uploaded
 * URL fills it full-bleed, a `preset:<id>` cover renders its gradient (a
 * preset string must never reach <Image> — RN throws on it), and an empty
 * value shows the placeholder. A photo caller (never a preset) simply resolves
 * to the image-or-placeholder cases.
 */
const ArtTile: React.FC<ArtTileProps> = ({ color, imageUrl, height, placeholder }) => {
  const cover = tileCover(imageUrl);
  return (
  <View
    style={[
      CommonScreenStyles.center,
      styles.tile,
      height ? { height } : styles.square,
      { backgroundColor: color },
    ]}
  >
    {cover.kind === 'image' ? (
      <Image source={{ uri: cover.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : cover.kind === 'preset' ? (
      <LinearGradient colors={cover.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    ) : (
      placeholder
    )}
  </View>
  );
};

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
