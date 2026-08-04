import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ArtTile from './ArtTile';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface ArtTileCardProps {
  /** The caption under the tile: also the tile's accessibility label */
  title: string;
  /** Tap handler. Omit for a display-only tile — a wish on someone else's
      wishlist, which you can see but not open. */
  onPress?: () => void;
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
 * An art tile with a caption: the one shape the tile family shares. The
 * wishlist, wish, and product cards each supply their own wash, placeholder,
 * and (for the priced ones) a cost subtitle; the wish card adds its fulfilled
 * dim and check badge via `dimmed` and `children`; the add tile puts a plus in
 * the placeholder and takes an accent caption color and a one-line clamp.
 * Pressable when given an onPress, a plain display tile without one (a wish
 * viewed on another user's wishlist). The tile, its caption, an optional cost
 * subtitle, and the pressable's accessibility wiring all live here (the one
 * place a tile caption is composed) so the whole family can't drift apart.
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
}) => {
  const content = (
    <>
      <ArtTile color={color} imageUrl={imageUrl} placeholder={placeholder}>
        {children}
      </ArtTile>
      <Text
        style={[styles.caption, captionColor !== undefined && { color: captionColor }]}
        numberOfLines={captionLines ?? 2}
      >
        {title}
      </Text>
      {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
    </>
  );
  const style = dimmed && CommonScreenStyles.dimmed;

  return onPress ? (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={style}
    >
      {content}
    </TouchableOpacity>
  ) : (
    <View accessibilityLabel={title} style={style}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  caption: {
    ...Typography.cardTitle,
    marginTop: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});

export default ArtTileCard;
