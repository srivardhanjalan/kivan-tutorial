import type { User } from '../services/api';

/** "First Last" from a backend user record, falling back to the email when no
    name is set: the one spelling of how a user is titled in search rows,
    follow lists, and their profile header. */
export function userDisplayName(
  user: Pick<User, 'first_name' | 'last_name' | 'email'>
): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email;
}
