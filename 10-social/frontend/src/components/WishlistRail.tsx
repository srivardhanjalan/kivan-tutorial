import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import WishlistCard from './WishlistCard';
import useLifeEvents from '../hooks/useLifeEvents';
import { Spacing } from '../constants/ScreenStyles';
import type { Wishlist } from '../services/api';

/** A rail card's width — a horizontal preview's own metric, not a grid cell
    (My Stuff's grid computes its own widths). */
const RAIL_CARD_WIDTH = 150;

interface WishlistRailProps {
  wishlists: Wishlist[];
  onPressWishlist: (id: string) => void;
}

/**
 * A horizontal, swipeable row of wishlist tiles: the Home preview of your
 * newest lists and Discover's "wishlists to love" rail share it. Resolves each
 * card's life-event emoji; the caller slices to its own limit.
 */
const WishlistRail: React.FC<WishlistRailProps> = ({ wishlists, onPressWishlist }) => {
  const { lifeEventFor } = useLifeEvents();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {wishlists.map((wishlist) => (
        <View key={wishlist.id} style={styles.railCard}>
          <WishlistCard
            wishlist={wishlist}
            lifeEvent={lifeEventFor(wishlist.life_event_id)}
            onPress={() => onPressWishlist(wishlist.id)}
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rail: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  railCard: {
    width: RAIL_CARD_WIDTH,
  },
});

export default WishlistRail;
