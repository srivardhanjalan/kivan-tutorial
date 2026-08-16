import React from 'react';
import { Text, StyleSheet } from 'react-native';
import ArtTile from './ArtTile';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';
import type { LifeEvent } from '../services/api';

interface LifeEventDetailHeroProps {
  /** The resolved life event: its pastel washes the tile and its name titles
      the block. Undefined while the taxonomy loads, and the wash falls neutral. */
  lifeEvent?: LifeEvent;
  /** The stored cover image; when set it fills the tile over the pastel. */
  imageUrl?: string | null;
  /** The image-less fallback glyph: the only piece that differs per caller
      (an event's neutral image glyph, a wishlist's life-event emoji). */
  placeholder: React.ReactNode;
}

/**
 * The life-event detail hero shared by the event and wishlist detail screens:
 * the shared {@link ArtTile} at the detail-hero height, washed by the life
 * event's pastel, carrying the cover image or the caller's placeholder, with
 * the life event's name titling it. Height, wash, and name line live here once
 * so the two screens can't drift; only the placeholder glyph is the caller's.
 */
const LifeEventDetailHero: React.FC<LifeEventDetailHeroProps> = ({
  lifeEvent,
  imageUrl,
  placeholder,
}) => (
  <>
    <ArtTile
      height={Spacing.detailHeroHeight}
      color={pastelForLifeEvent(lifeEvent?.id ?? '')}
      imageUrl={imageUrl}
      placeholder={placeholder}
    />
    {lifeEvent && <Text style={styles.name}>{lifeEvent.name}</Text>}
  </>
);

const styles = StyleSheet.create({
  name: {
    ...Typography.bodySecondary,
    marginTop: Spacing.md,
  },
});

export default LifeEventDetailHero;
