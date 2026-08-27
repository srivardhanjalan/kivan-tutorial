import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CoverPhoto from './CoverPhoto';
import { RSVP_LABEL } from '../constants/rsvpLabels';
import { eventDateChip } from '../utils/formatEventDate';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';
import type { Event, RsvpStatus } from '../services/api';

const BANNER_HEIGHT = 150;

interface EventRailCardProps {
  event: Event;
  onPress: () => void;
  /** True for events I host (a "Hosting" pill), false for ones I'm invited to. */
  isHosting: boolean;
  /** My RSVP on an invited event, appended to the pill ("Invited · Going"). */
  rsvp?: RsvpStatus | null;
}

/**
 * A full-width event banner for the My Stuff lists: the event's cover photo (or,
 * with none, the owner's deterministic gradient) rides the shared CoverPhoto
 * band, under a bottom scrim, with a compact date chip top-left, a
 * Hosting/Invited pill top-right (an invited event appends my RSVP), and the
 * name + location at the foot. The image-forward convergence of the old pastel
 * EventCard tile; every overlay color is a token, so the banner invents no hex
 * literals.
 */
const EventRailCard: React.FC<EventRailCardProps> = ({ event, onPress, isHosting, rsvp }) => {
  const { month, day } = eventDateChip(event.event_date);
  const pillText = isHosting
    ? 'Hosting'
    : rsvp && rsvp !== 'pending'
      ? `Invited · ${RSVP_LABEL[rsvp]}`
      : 'Invited';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={event.name}
    >
      <CoverPhoto
        ownerId={event.id}
        coverPhoto={event.image_url}
        height={BANNER_HEIGHT}
        borderRadius={BorderRadius.xl}
      >
        <LinearGradient
          colors={['transparent', Colors.coverScrim]}
          style={styles.scrim}
          pointerEvents="none"
        />
        <View style={styles.dateChip}>
          <Text style={styles.dateMonth}>{month}</Text>
          {day ? <Text style={styles.dateDay}>{day}</Text> : null}
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{pillText}</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {event.name}
          </Text>
          {event.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={Colors.white} />
              <Text style={styles.locationText} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>
      </CoverPhoto>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96,
  },
  dateChip: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.glassFallback,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  rolePill: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.coverScrim,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  textBlock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.hairlineGap,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 21,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.white,
    flex: 1,
  },
});

export default EventRailCard;
