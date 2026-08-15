import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar, { LIST_ROW_AVATAR_SIZE } from './Avatar';
import { userDisplayName } from '../utils/userName';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { Spacing } from '../constants/ScreenStyles';
import { RSVP_LABEL } from '../constants/rsvpLabels';
import type { EventInvitee, RsvpStatus } from '../services/api';

/** The accent each RSVP carries: a confirmed yes goes success-green, the rest
    stay quiet so "Going" is what the eye lands on. */
const RSVP_COLOR: Record<RsvpStatus, string> = {
  pending: Colors.textMuted,
  going: Colors.success,
  maybe: Colors.textSecondary,
  not_going: Colors.textMuted,
};

/** A guest's title: their name when the invite reached a user, else the raw
    email it was addressed to (an email invite carries no user record). */
function guestName(invitee: EventInvitee): string {
  return invitee.user ? userDisplayName(invitee.user) : invitee.invitee_id;
}

interface EventGuestListProps {
  /** Already filtered by the caller (a host sees everyone; a guest sees only
      confirmed "going" attendees), so this just draws what it's given. */
  guests: EventInvitee[];
  /** Host-only: removing a guest. Omitted for a guest's view, which hides the
      remove affordance entirely. */
  onRemove?: (invitee: EventInvitee) => void;
}

/**
 * The event's guest list: one row per invitee (avatar, name, and their RSVP),
 * with a host-only remove button on the right. A user invite shows the invited
 * person; an email invite shows the address it was sent to until that person
 * signs up.
 */
const EventGuestList: React.FC<EventGuestListProps> = ({ guests, onRemove }) => (
  <>
    {guests.map((invitee) => (
      <View key={invitee.invitee_id} style={styles.row}>
        <Avatar
          imageUrl={invitee.user?.image_url}
          name={guestName(invitee)}
          size={LIST_ROW_AVATAR_SIZE}
        />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {guestName(invitee)}
          </Text>
          <Text style={[styles.status, { color: RSVP_COLOR[invitee.rsvp_status] }]}>
            {RSVP_LABEL[invitee.rsvp_status]}
          </Text>
        </View>
        {onRemove && (
          <TouchableOpacity
            onPress={() => onRemove(invitee)}
            activeOpacity={Opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${guestName(invitee)}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    ))}
  </>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  text: {
    flex: 1,
  },
  name: {
    ...Typography.bodySecondaryStrong,
  },
  status: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});

export default EventGuestList;
