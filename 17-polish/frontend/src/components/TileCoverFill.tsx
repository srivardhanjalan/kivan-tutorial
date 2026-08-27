import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tileCover } from '../constants/DefaultCoverPhotos';

/**
 * Fills a clipped art block with a tile's stored `image_url`: a custom uploaded
 * URL full-bleed, a `preset:<id>` cover as its gradient, or the caller's
 * `placeholder` when empty. The one place that *renders* a {@link tileCover}
 * decision — a preset string must never reach <Image> (RN throws on it), so the
 * classify-and-render pair lives here rather than inline at each tile. Callers
 * (the square ArtTile, the pastel WishlistRailCard) supply their own wrapper,
 * wash, and overlays around this fill.
 */
export default function TileCoverFill({
  coverPhoto,
  placeholder,
}: {
  coverPhoto: string | null | undefined;
  placeholder: React.ReactNode;
}) {
  const cover = tileCover(coverPhoto);
  if (cover.kind === 'image') {
    return <Image source={{ uri: cover.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  }
  if (cover.kind === 'preset') {
    return (
      <LinearGradient
        colors={cover.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <>{placeholder}</>;
}
