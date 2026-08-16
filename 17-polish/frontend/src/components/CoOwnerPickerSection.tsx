import React from 'react';
import { View, StyleSheet } from 'react-native';
import FieldLabel from './FieldLabel';
import PersonRow from './PersonRow';
import RemovePersonButton from './RemovePersonButton';
import UserSearchPicker from './UserSearchPicker';
import useUserSearch from '../hooks/useUserSearch';
import { userDisplayName } from '../utils/userName';
import type { User } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

interface CoOwnerPickerSectionProps {
  /** The people staged as co-owners, shown as removable rows above the search. */
  selected: User[];
  onAdd: (user: User) => void;
  onRemove: (userId: string) => void;
  /** Dropped from search alongside the already-staged, so you can't pick yourself. */
  currentUserId: string;
}

/**
 * Stage co-owners while creating a wishlist: the people you've picked shown as
 * removable rows, then the shared Discover-style search to add more. The chosen
 * co-owners seed the wishlist's owners at create (a wishlist with none is
 * personal). It reuses the same debounced people search and person row as the
 * event invite and add-co-owner flows, so picking a co-owner looks like finding
 * a person anywhere else in the app. This only seeds owners at create; after the
 * wishlist exists, owners are managed from its detail screen.
 */
export default function CoOwnerPickerSection({
  selected,
  onAdd,
  onRemove,
  currentUserId,
}: CoOwnerPickerSectionProps) {
  const selectedIds = new Set(selected.map((u) => u.id));
  const { query, setQuery, results } = useUserSearch(
    (u) => u.id !== currentUserId && !selectedIds.has(u.id)
  );

  return (
    <View style={styles.section}>
      <FieldLabel>Co-owners</FieldLabel>
      {selected.map((user) => (
        <PersonRow
          key={user.id}
          imageUrl={user.image_url ?? undefined}
          name={userDisplayName(user)}
          subtitle={user.email}
          trailing={
            <RemovePersonButton label={userDisplayName(user)} onPress={() => onRemove(user.id)} />
          }
        />
      ))}
      <UserSearchPicker
        query={query}
        onChangeQuery={setQuery}
        results={results}
        onPick={onAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
});
