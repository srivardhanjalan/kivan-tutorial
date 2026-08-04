import React from 'react';
import TileGrid from './TileGrid';
import WishlistCard from './WishlistCard';
import useLifeEvents from '../hooks/useLifeEvents';
import type { Wishlist } from '../services/api';

interface WishlistGridProps {
  wishlists: Wishlist[];
  onPressWishlist: (id: string) => void;
  /** An optional tile ahead of the wishlists: My Stuff's "New Wishlist" add
      tile. Omitted on a profile, which is read-only. */
  leading?: React.ReactNode;
}

/**
 * The wishlist tile grid shared by My Stuff and a profile's Wishlists/Loved
 * sections: resolves each card's life-event emoji and lays the cards out. The
 * card map lived in both screens until the profile made it a third caller:
 * one grid now, so the tile layout can't drift between "your stuff" and
 * "theirs".
 */
const WishlistGrid: React.FC<WishlistGridProps> = ({
  wishlists,
  onPressWishlist,
  leading,
}) => {
  const { lifeEventFor } = useLifeEvents();
  return (
    <TileGrid>
      {leading}
      {wishlists.map((wishlist) => (
        <WishlistCard
          key={wishlist.id}
          wishlist={wishlist}
          lifeEvent={lifeEventFor(wishlist.life_event_id)}
          onPress={() => onPressWishlist(wishlist.id)}
        />
      ))}
    </TileGrid>
  );
};

export default WishlistGrid;
