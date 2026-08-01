import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import ArtTile from './ArtTile';
import TileCaption from './TileCaption';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';

interface ArtTileCardProps {
  /** The caption under the tile: also the tile's accessibility label */
  title: string;
  onPress: () => void;
  /** The art block's wash: a life-event pastel, or a neutral fill */
  color: string;
  imageUrl?: string | null;
  /** The image-less fallback (a life-event emoji or the image glyph) */
  placeholder: React.ReactNode;
  /** A muted line under the title: a wish/product cost. Omit for none. */
  subtitle?: string;
  /** Dims the whole tile: a wish's fulfilled state */
  dimmed?: boolean;
  /** Caption color override: the add tile's caption wears the brand accent */
  captionColor?: string;
  /** Caption line clamp: the add tile pins its single-word label to one line */
  captionLines?: number;
  /** Overlays riding on the art block (the fulfilled check badge) */
  children?: React.ReactNode;
}

/**
 * A pressable art tile with a caption: the one shape the tile family shares.
 * The wishlist, wish, and product cards each supply their own wash,
 * placeholder, and (for the priced ones) a cost subtitle; the wish card adds
 * its fulfilled dim and check badge via `dimmed` and `children`; the add tile
 * puts a plus in the placeholder and forwards its accent caption color and
 * one-line clamp. The tile/caption/subtitle composition and the pressable's
 * accessibility wiring live here so the whole family can't drift apart.
 */
const ArtTileCard: React.FC<ArtTileCardProps> = ({
  title,
  onPress,
  color,
  imageUrl,
  placeholder,
  subtitle,
  dimmed,
  captionColor,
  captionLines,
  children,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={title}
    style={dimmed && styles.dimmed}
  >
    <ArtTile color={color} imageUrl={imageUrl} placeholder={placeholder}>
      {children}
    </ArtTile>
    <TileCaption color={captionColor} numberOfLines={captionLines}>{title}</TileCaption>
    {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  dimmed: {
    opacity: Opacity.disabled,
  },
  subtitle: {
    ...Typography.bodySecondary,
    // A hairline gap under the name: smaller than the spacing scale on purpose
    marginTop: 2,
  },
});

export default ArtTileCard;
