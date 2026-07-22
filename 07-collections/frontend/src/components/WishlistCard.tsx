import React from 'react';
import { TouchableOpacity } from 'react-native';
import ArtTile from './ArtTile';
import TileCaption from './TileCaption';
import WishlistPlaceholderGlyph from './WishlistPlaceholderGlyph';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import type { Wishlist, LifeEvent } from '../services/api';

interface WishlistCardProps {
  wishlist: Wishlist;
  /** The wishlist's life event, resolved by the parent — drives the emoji */
  lifeEvent?: LifeEvent;
  onPress: () => void;
}

/**
 * A wishlist as a tonal tile: the art block washes in the life event's pastel,
 * shows the wishlist image when one is set, and otherwise falls back to the
 * event's emoji (or a gift). The name sits below. No counts — those arrive
 * with the pills in a later step.
 */
const WishlistCard: React.FC<WishlistCardProps> = ({ wishlist, lifeEvent, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={wishlist.name}
  >
    <ArtTile
      color={pastelForLifeEvent(wishlist.life_event_id)}
      imageUrl={wishlist.image_url}
      placeholder={<WishlistPlaceholderGlyph lifeEvent={lifeEvent} size={Spacing.tileGlyphSize} />}
    />
    <TileCaption>{wishlist.name}</TileCaption>
  </TouchableOpacity>
);

export default WishlistCard;
