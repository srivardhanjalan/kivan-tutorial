import React from 'react';
import ArtTileCard from './ArtTileCard';
import WishlistPlaceholderGlyph from './WishlistPlaceholderGlyph';
import { Spacing } from '../constants/ScreenStyles';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import type { Wishlist, LifeEvent } from '../services/api';

interface WishlistCardProps {
  wishlist: Wishlist;
  /** The wishlist's life event, resolved by the parent: drives the emoji */
  lifeEvent?: LifeEvent;
  onPress: () => void;
}

/**
 * A wishlist as a tonal tile (the shared ArtTileCard): the art block washes in
 * the life event's pastel, shows the wishlist image when one is set, and
 * otherwise falls back to the event's emoji (or a gift). The name sits below,
 * with no cost line: a wishlist isn't priced.
 */
const WishlistCard: React.FC<WishlistCardProps> = ({ wishlist, lifeEvent, onPress }) => (
  <ArtTileCard
    title={wishlist.name}
    onPress={onPress}
    color={pastelForLifeEvent(wishlist.life_event_id)}
    imageUrl={wishlist.image_url}
    placeholder={<WishlistPlaceholderGlyph lifeEvent={lifeEvent} size={Spacing.tileGlyphSize} />}
  />
);

export default WishlistCard;
