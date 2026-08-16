import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import ArtTile from './ArtTile';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';

interface ArtTileCardProps {
  /** The caption under the tile: also the tile's accessibility label */
  title: string;
  onPress: () => void;
  /** The art block's wash: a life-event pastel, or a neutral fill */
  color: string;
  imageUrl?: string | null;
  /** The image-less fallback (a life-event emoji or the add glyph) */
  placeholder: React.ReactNode;
  /** Caption color override: the add tile's caption wears the brand accent */
  captionColor?: string;
  /** Caption line clamp: the add tile pins its single-word label to one line */
  captionLines?: number;
}

/**
 * An art tile with a caption: the one shape the tile family shares. The wishlist
 * card and the add tile each supply their own wash and placeholder; the add tile
 * also takes an accent caption color and a one-line clamp. The tile, its
 * caption, and the pressable's accessibility wiring live here (the one place a
 * tile caption is composed) so the family can't drift apart.
 */
const ArtTileCard: React.FC<ArtTileCardProps> = ({
  title,
  onPress,
  color,
  imageUrl,
  placeholder,
  captionColor,
  captionLines,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <ArtTile color={color} imageUrl={imageUrl} placeholder={placeholder} />
    <Text
      style={[styles.caption, captionColor !== undefined && { color: captionColor }]}
      numberOfLines={captionLines ?? 2}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  caption: {
    ...Typography.cardTitle,
    marginTop: Spacing.sm,
  },
});

export default ArtTileCard;
