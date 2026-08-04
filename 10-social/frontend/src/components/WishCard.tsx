import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArtTileCard from './ArtTileCard';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { formatCost } from '../utils/formatCost';
import type { Wish } from '../services/api';

interface WishCardProps {
  wish: Wish;
  /** Tap handler. Omit on another user's wishlist — the wish is display-only. */
  onPress?: () => void;
  /** The logo of the store or brand this wish came from (sourced wishes only).
      Shown as a corner badge on an active wish; a completed wish wears the
      check instead. */
  originLogo?: string | null;
}

/**
 * A wish as an image-led tile (the shared ArtTileCard): the photo fills the art
 * block, name and cost sit below. A wish added from a store or captured in the
 * in-app browser wears that source's logo in the corner. A completed wish dims
 * and wears a check: the got-it state read at a glance. Pressable on your own
 * wishlist, display-only when viewing someone else's.
 */
const WishCard: React.FC<WishCardProps> = ({ wish, onPress, originLogo }) => (
  <ArtTileCard
    title={wish.name}
    onPress={onPress}
    color={Colors.subtleFill}
    imageUrl={wish.image_url}
    placeholder={<ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />}
    subtitle={wish.cost !== null ? formatCost(wish.cost, wish.cost_currency) : undefined}
    dimmed={wish.completed}
  >
    {originLogo && !wish.completed && (
      <View style={[CommonScreenStyles.center, styles.originBadge]}>
        <Image source={{ uri: originLogo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    )}
    {wish.completed && (
      <View style={[CommonScreenStyles.center, styles.checkBadge]}>
        <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
      </View>
    )}
  </ArtTileCard>
);

const styles = StyleSheet.create({
  // The origin logo sits opposite the check badge's corner so the two never collide
  originBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
  },
});

export default WishCard;
