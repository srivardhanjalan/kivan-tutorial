import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassPill from './GlassPill';
import ImageForwardCard from './ImageForwardCard';
import GlassPricePill from './GlassPricePill';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
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

/**
 * A wish as an image-forward tile (the shared ImageForwardCard): the photo fills
 * a rounded card, with a blurred glass price pill riding the bottom and the
 * store/brand logo in a glass badge in the top corner. A completed wish dims and
 * wears a check in that same corner (so badge and check never collide). No
 * caption — the image is the tile; the name rides the accessibility label.
 * Pressable on your own wishlist, display-only when viewing someone else's.
 */
const WishCard: React.FC<WishCardProps> = ({ wish, onPress, originLogo }) => {
  const content = (
    <ImageForwardCard imageUrl={wish.image_url} dimmed={wish.completed}>
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
      <GlassPricePill cost={wish.cost} currency={wish.cost_currency} />
    </ImageForwardCard>
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
});

export default WishCard;
