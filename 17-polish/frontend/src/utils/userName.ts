import type { EventInvitee, User } from '../services/api';

/** "First Last" from a backend user record, falling back to the email when no
    name is set: the one spelling of how a user is titled in search rows,
    follow lists, and their profile header. */
export function userDisplayName(
  user: Pick<User, 'first_name' | 'last_name' | 'email'>
): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email;
}

/** How an event invitee is titled: a user invitee reads as their name, an email
    invitee reads as the raw email that keys its row (there is no user record to
    name until that address signs up). The one spelling shared by the guest list
    and the remove-guest confirmation. */
export function inviteeDisplayName(invitee: EventInvitee): string {
  return invitee.user ? userDisplayName(invitee.user) : invitee.invitee_id;
}
