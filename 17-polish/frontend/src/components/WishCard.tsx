import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassPill from './GlassPill';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import { formatCost } from '../utils/formatCost';
import type { Wish } from '../services/api';

interface WishCardProps {
  wish: Wish;
  /** Tap handler. Omit on another user's wishlist: the wish is display-only. */
  onPress?: () => void;
  /** The logo of the store or brand this wish came from (sourced wishes only).
      Shown as a glass corner badge on an active wish; a completed wish wears the
      check instead, so the two never share the corner. */
  originLogo?: string | null;
}

/** The tile's height follows its photo; until the image loads (and for a wish
    with no image) it holds this portrait ratio, matching the collection look. */
const DEFAULT_ASPECT = 0.75;

/**
 * A wish as an image-forward tile: the photo fills a rounded card, with a
 * blurred glass price pill riding the bottom and the store/brand logo in a
 * glass badge in the top corner. A completed wish dims and wears a check in
 * that same corner (so badge and check never collide). No caption — the image
 * is the tile; the name rides the accessibility label. Pressable on your own
 * wishlist, display-only when viewing someone else's. Sizes to its photo's
 * aspect ratio so a column of these staggers into a masonry.
 */
const WishCard: React.FC<WishCardProps> = ({ wish, onPress, originLogo }) => {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);

  const content = (
    <View style={[styles.card, wish.completed && CommonScreenStyles.dimmed]}>
      {wish.image_url ? (
        <Image
          source={{ uri: wish.image_url }}
          style={[styles.image, { aspectRatio }]}
          resizeMode="cover"
          onLoad={({ nativeEvent: { source } }) => {
            if (source?.width && source?.height) setAspectRatio(source.width / source.height);
          }}
        />
      ) : (
        <View style={[styles.image, styles.placeholder, { aspectRatio: DEFAULT_ASPECT }]}>
          <ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />
        </View>
      )}

      {originLogo && !wish.completed && (
        <GlassPill style={[CommonScreenStyles.center, styles.badge]}>
          <Image source={{ uri: originLogo }} style={styles.badgeLogo} resizeMode="cover" />
        </GlassPill>
      )}
      {wish.completed && (
        <View style={[CommonScreenStyles.center, styles.checkBadge]}>
          <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
        </View>
      )}

      {wish.cost !== null && (
        <GlassPill style={[CommonScreenStyles.center, styles.pricePill]}>
          <Text style={styles.priceText} numberOfLines={1}>
            {formatCost(wish.cost, wish.cost_currency)}
          </Text>
        </GlassPill>
      )}
    </View>
  );

  return onPress ? (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={wish.name}
    >
      {content}
    </TouchableOpacity>
  ) : (
    <View accessibilityLabel={wish.name}>{content}</View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  image: {
    width: '100%',
  },
  placeholder: {
    ...CommonScreenStyles.center,
    backgroundColor: Colors.subtleFill,
  },
  // Origin badge and completed check share the top-left corner, and only one
  // shows at a time (the badge on an active wish, the check on a done one), so
  // they cannot overlap (PR #74: no store-logo/other-chrome collision).
  badge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  badgeLogo: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
  },
  pricePill: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  priceText: {
    ...Typography.bodySecondaryStrong,
  },
});

export default WishCard;
