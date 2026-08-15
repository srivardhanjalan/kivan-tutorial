import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PersonRow from './PersonRow';
import { userDisplayName } from '../utils/userName';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';
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
            <TouchableOpacity
              onPress={() => onRemove(owner)}
              activeOpacity={Opacity.pressed}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${userDisplayName(owner)}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          )
        }
      />
    ))}
  </>
);

export default WishlistOwnerList;
