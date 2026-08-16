import React from 'react';
import PersonRow from './PersonRow';
import { userDisplayName } from '../utils/userName';
import type { User } from '../services/api';

interface UserRowProps {
  user: Pick<User, 'first_name' | 'last_name' | 'email' | 'image_url'>;
  onPress: () => void;
  /** A muted second line: a follower tally on the Discover rail. Omit for none. */
  subtitle?: string;
}

/**
 * A {@link PersonRow} for a `User`: it derives the display name and avatar so a
 * person looks the same behind Discover's search results and the
 * followers/following lists.
 */
const UserRow: React.FC<UserRowProps> = ({ user, onPress, subtitle }) => (
  <PersonRow
    imageUrl={user.image_url}
    name={userDisplayName(user)}
    subtitle={subtitle}
    onPress={onPress}
  />
);

export default UserRow;
