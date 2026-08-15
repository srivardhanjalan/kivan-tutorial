import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ModalCard from './ModalCard';
import FormInput from './FormInput';
import UserRow from './UserRow';
import PrimaryButton from './PrimaryButton';
import { useToast } from './ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import useUserSearch from '../hooks/useUserSearch';
import { addWishlistOwner } from '../services/api';
import type { User } from '../services/api';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface ManageOwnersModalProps {
  visible: boolean;
  wishlistId: string;
  /** The current owners, so anyone already an owner is dropped from search. */
  owners: User[];
  onClose: () => void;
  /** Fired after an owner is added, so the detail screen re-pulls the list. */
  onAdded: () => void;
}

/**
 * Add a co-owner to a wishlist: search people by name and tap to promote one to
 * full owner. It reuses the same debounced people search and person row as the
 * event invite flow: adding a co-owner looks like finding a person anywhere
 * else in the app. A co-owner is granted immediately (no invite/accept step) and
 * becomes a full owner: they can edit, delete, and manage owners too. Removal
 * lives on the detail screen, next to the owner it removes.
 */
export default function ManageOwnersModal({
  visible,
  wishlistId,
  owners,
  onClose,
  onAdded,
}: ManageOwnersModalProps) {
  const toast = useToast();
  const { loading: adding, run } = useAsyncAction();

  const ownerIds = new Set(owners.map((o) => o.id));
  const { query, setQuery, results, reset } = useUserSearch((u) => !ownerIds.has(u.id));

  // Clear the box each time the modal opens, so it never reopens mid-search.
  useEffect(() => {
    if (!visible) return;
    reset();
  }, [visible, reset]);

  const addOwner = (user: User) =>
    run(async () => {
      await addWishlistOwner(wishlistId, user.id);
      toast.show('Co-owner added');
      onAdded();
      onClose();
    }, 'Could not add that co-owner');

  const searching = query.trim().length > 0;

  return (
    <ModalCard
      visible={visible}
      title="Add a co-owner"
      message="A co-owner can view, edit, and delete this wishlist."
    >
      <FormInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search people by name"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        editable={!adding}
      />
      {searching &&
        (results.length === 0 ? (
          <Text style={styles.hint}>No one to add.</Text>
        ) : (
          results.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              subtitle={user.email}
              onPress={() => addOwner(user)}
            />
          ))
        ))}

      <View style={styles.gap} />
      <PrimaryButton title="Done" variant="secondary" onPress={onClose} />
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...Typography.bodySecondary,
    paddingVertical: Spacing.sm,
  },
  gap: {
    height: Spacing.md,
  },
});
