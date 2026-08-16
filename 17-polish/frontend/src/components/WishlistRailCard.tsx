import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WishlistPlaceholderGlyph from './WishlistPlaceholderGlyph';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { Wishlist, LifeEvent } from '../services/api';

interface WishlistRailCardProps {
  wishlist: Wishlist;
  /** The wishlist's life event, resolved by the parent: drives the emoji and
      the pastel wash behind an image-less tile. */
  lifeEvent?: LifeEvent;
  onPress: () => void;
  /** A wish-count pill on the art, when the caller carries the count. Omitted
      where the payload doesn't (My Stuff reads the list, which the tutorial
      does not denormalize a wish_count onto). */
  wishCount?: number;
  /** Marks a co-owned (group) wishlist with a people chip, when the caller
      knows it. Omitted where ownership isn't loaded. */
  group?: boolean;
}

/**
 * A wishlist as a tonal tile: the uploaded cover photo fills the art block when
 * set, else a pastel wash in the life event's color with its emoji (or a gift)
 * centered. Small translucent pills ride the art — a love tally, a group chip,
 * a wish count — and the name sits below. The image-forward tile My Stuff and
 * the profile grids wear, replacing the caption-below ArtTileCard idiom.
 */
const WishlistRailCard: React.FC<WishlistRailCardProps> = ({
  wishlist,
  lifeEvent,
  onPress,
  wishCount,
  group,
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={Opacity.pressed} accessibilityRole="button" accessibilityLabel={wishlist.name}>
    <View style={[CommonScreenStyles.center, styles.art, { backgroundColor: pastelForLifeEvent(wishlist.life_event_id) }]}>
      {wishlist.image_url ? (
        <Image source={{ uri: wishlist.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <WishlistPlaceholderGlyph lifeEvent={lifeEvent} size={Spacing.detailHeroGlyphSize} />
      )}

      {group && (
        <View style={[CommonScreenStyles.center, styles.groupChip]}>
          <Ionicons name="people" size={13} color={Colors.dark} />
        </View>
      )}
      {wishlist.love_count > 0 && (
        <View style={[CommonScreenStyles.center, styles.lovePill]}>
          <Text style={styles.pillText}>♥ {wishlist.love_count}</Text>
        </View>
      )}
      {wishCount !== undefined && (
        <View style={[CommonScreenStyles.center, styles.countPill]}>
          <Text style={styles.pillText}>{wishCount} {wishCount === 1 ? 'wish' : 'wishes'}</Text>
        </View>
      )}
    </View>
    <Text style={styles.name} numberOfLines={2}>{wishlist.name}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  art: {
    aspectRatio: 1 / 0.92,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  groupChip: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassFallback,
  },
  lovePill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassFallback,
  },
  countPill: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassFallback,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark,
  },
  name: {
    ...Typography.cardTitle,
    marginTop: Spacing.sm,
  },
});

export default WishlistRailCard;
