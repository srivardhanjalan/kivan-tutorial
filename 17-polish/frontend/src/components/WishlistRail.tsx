import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import ArtTileCard from './ArtTileCard';
import WishlistPlaceholderGlyph from './WishlistPlaceholderGlyph';
import useLifeEvents from '../hooks/useLifeEvents';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { Wishlist } from '../services/api';

/** A rail card's width: a horizontal preview's own metric, not a grid cell
    (My Stuff's grid computes its own widths). */
const RAIL_CARD_WIDTH = 150;

interface WishlistRailProps {
  wishlists: Wishlist[];
  onPressWishlist: (id: string) => void;
}

/**
 * A horizontal, swipeable row of wishlist tiles — Discover's "popular" and
 * "wishlists to love" rails both ride it. Each tile is an art block washed in
 * the life event's pastel (its image when set, else the event's emoji) with the
 * name below; the caller slices to its own limit.
 */
const WishlistRail: React.FC<WishlistRailProps> = ({ wishlists, onPressWishlist }) => {
  const { lifeEventFor } = useLifeEvents();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={CommonScreenStyles.horizontalRail}
    >
      {wishlists.map((wishlist) => (
        <View key={wishlist.id} style={styles.railCard}>
          <ArtTileCard
            title={wishlist.name}
            onPress={() => onPressWishlist(wishlist.id)}
            color={pastelForLifeEvent(wishlist.life_event_id)}
            imageUrl={wishlist.image_url}
            placeholder={
              <WishlistPlaceholderGlyph
                lifeEvent={lifeEventFor(wishlist.life_event_id)}
                size={Spacing.tileGlyphSize}
              />
            }
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  railCard: {
    width: RAIL_CARD_WIDTH,
  },
});

export default WishlistRail;
