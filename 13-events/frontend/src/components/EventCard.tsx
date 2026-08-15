import React from 'react';
import ArtTileCard from './ArtTileCard';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import { Spacing } from '../constants/ScreenStyles';
import formatEventDate from '../utils/formatEventDate';
import type { Event } from '../services/api';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

/**
 * An event tile for the My Stuff grid: the same art-block-plus-caption shape as
 * a wishlist card, washed in the event type's pastel (an event carries a
 * life-event id just as a wishlist does) with the date as its subtitle. An
 * image-less event shows the neutral image glyph over the wash.
 */
const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => (
  <ArtTileCard
    title={event.name}
    onPress={onPress}
    color={pastelForLifeEvent(event.event_type ?? '')}
    imageUrl={event.image_url}
    placeholder={<ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />}
    subtitle={formatEventDate(event.event_date)}
  />
);

export default EventCard;
