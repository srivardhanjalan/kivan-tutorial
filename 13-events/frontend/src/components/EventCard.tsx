import React from 'react';
import ArtTileCard from './ArtTileCard';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import { RSVP_LABEL } from '../constants/rsvpLabels';
import { Spacing } from '../constants/ScreenStyles';
import formatEventDate from '../utils/formatEventDate';
import type { Event, RsvpStatus } from '../services/api';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  /** For an event I'm invited to: my RSVP, shown after the date so My Stuff's
      Invited row reads "Sep 1, 2026 · Going". Omitted for events I host. */
  rsvp?: RsvpStatus | null;
}

/**
 * An event tile for the My Stuff grid: the same art-block-plus-caption shape as
 * a wishlist card, washed in the event type's pastel (an event carries a
 * life-event id just as a wishlist does) with the date as its subtitle, and my
 * RSVP appended when it's an event I'm invited to. An image-less event shows the
 * neutral image glyph over the wash.
 */
const EventCard: React.FC<EventCardProps> = ({ event, onPress, rsvp }) => {
  const date = formatEventDate(event.event_date);
  const subtitle = rsvp ? `${date} · ${RSVP_LABEL[rsvp]}` : date;
  return (
    <ArtTileCard
      title={event.name}
      onPress={onPress}
      color={pastelForLifeEvent(event.event_type ?? '')}
      imageUrl={event.image_url}
      placeholder={<ImagePlaceholderGlyph size={Spacing.tileGlyphSize} />}
      subtitle={subtitle}
    />
  );
};

export default EventCard;
