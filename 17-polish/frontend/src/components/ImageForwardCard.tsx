import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/** The tile's height follows its photo; until the image loads (and for one with
    no image) it holds this portrait ratio, matching the collection look. */
const DEFAULT_ASPECT = 0.75;

interface ImageForwardCardProps {
  imageUrl?: string | null;
  /** Dims the card (e.g. a completed wish). */
  dimmed?: boolean;
  /** Overlays floated on the image — a glass price pill, an origin badge. */
  children?: React.ReactNode;
}

/**
 * The image-forward tile shared by the wish and product cards: a photo fills a
 * rounded card and sizes to its own aspect ratio so a column of these staggers
 * into a masonry, with a placeholder glyph standing in when there's no photo.
 * Callers float their own chrome (price pill, badges) as children. A wish and a
 * product read as the same tile because a product becomes a wish.
 */
const ImageForwardCard: React.FC<ImageForwardCardProps> = ({ imageUrl, dimmed, children }) => {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);

  return (
    <View style={[CommonScreenStyles.imageCard, dimmed && CommonScreenStyles.dimmed]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { aspectRatio }]}
          resizeMode="cover"
          onLoad={({ nativeEvent: { source } }) => {
            if (source?.width && source?.height) setAspectRatio(source.width / source.height);
          }}
        />
      ) : (
        <View style={[styles.image, CommonScreenStyles.imageCardPlaceholder, { aspectRatio: DEFAULT_ASPECT }]}>
          <ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
  },
});

export default ImageForwardCard;
