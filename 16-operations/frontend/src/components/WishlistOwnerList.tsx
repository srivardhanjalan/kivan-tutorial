import React from 'react';
import PersonRow from './PersonRow';
import RemovePersonButton from './RemovePersonButton';
import { userDisplayName } from '../utils/userName';
import type { User } from '../services/api';

interface WishlistOwnerListProps {
  /** The creator and every co-owner. */
  owners: User[];
  /** Owner-only: removing a co-owner. Omitted for the last owner (a wishlist
      always keeps at least one), which hides the remove affordance entirely. */
  onRemove?: (owner: User) => void;
}

/**
 * A wishlist's owners: one {@link PersonRow} per owner (avatar, name, email),
 * with an owner-only remove button on the right. The same row and remove idiom
 * as the event guest list, so an owner reads the same as a guest, fitting
 * since a co-owner is added the same direct way, minus the RSVP.
 */
const WishlistOwnerList: React.FC<WishlistOwnerListProps> = ({ owners, onRemove }) => (
  <>
    {owners.map((owner) => (
      <PersonRow
        key={owner.id}
        imageUrl={owner.image_url ?? undefined}
        name={userDisplayName(owner)}
        subtitle={owner.email}
        trailing={
          onRemove && (
            <RemovePersonButton
              label={userDisplayName(owner)}
              onPress={() => onRemove(owner)}
            />
          )
        }
      />
    ))}
  </>
);

export default WishlistOwnerList;
