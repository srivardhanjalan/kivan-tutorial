import React from 'react';
import PersonRow from './PersonRow';
import RemovePersonButton from './RemovePersonButton';
import { inviteeDisplayName } from '../utils/userName';
import Colors from '../constants/Colors';
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

interface EventGuestListProps {
  /** Already filtered by the caller (a host sees everyone; a guest sees only
      confirmed "going" attendees), so this just draws what it's given. */
  guests: EventInvitee[];
  /** Host-only: removing a guest. Omitted for a guest's view, which hides the
      remove affordance entirely. */
  onRemove?: (invitee: EventInvitee) => void;
}

/**
 * The event's guest list: one {@link PersonRow} per invitee (avatar, name, and
 * their RSVP), with a host-only remove button on the right. A user invite shows
 * the invited person; an email invite shows the address it was sent to until
 * that person signs up.
 */
const EventGuestList: React.FC<EventGuestListProps> = ({ guests, onRemove }) => (
  <>
    {guests.map((invitee) => (
      <PersonRow
        key={invitee.invitee_id}
        imageUrl={invitee.user?.image_url}
        name={inviteeDisplayName(invitee)}
        subtitle={RSVP_LABEL[invitee.rsvp_status]}
        subtitleColor={RSVP_COLOR[invitee.rsvp_status]}
        trailing={
          onRemove && (
            <RemovePersonButton
              label={inviteeDisplayName(invitee)}
              onPress={() => onRemove(invitee)}
            />
          )
        }
      />
    ))}
  </>
);

export default EventGuestList;
