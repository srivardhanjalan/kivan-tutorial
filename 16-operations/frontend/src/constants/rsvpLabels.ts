import type { RsvpStatus } from '../services/api';

/** How each RSVP reads wherever a guest's status is shown: the detail screen's
    guest list and the My Stuff invited tile both title a status from here, so
    "Going" and "Can't go" can't drift between the two. "pending" reads as
    "Invited": a guest who simply hasn't answered yet. */
export const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: 'Invited',
  going: 'Going',
  maybe: 'Maybe',
  not_going: "Can't go",
};
