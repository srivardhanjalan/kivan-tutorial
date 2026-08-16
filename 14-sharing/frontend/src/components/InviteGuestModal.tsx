import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ModalCard from './ModalCard';
import FormInput from './FormInput';
import UserSearchPicker from './UserSearchPicker';
import ConfirmCancelButtons from './ConfirmCancelButtons';
import { useToast } from './ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import useUserSearch from '../hooks/useUserSearch';
import { addEventInvitee } from '../services/api';
import type { EventInvitee, User } from '../services/api';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/** A pragmatic "looks like an email" check: something, an @, something, a dot,
    something. The backend trusts the address verbatim, so this is the only
    guard before an email invite goes out. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteGuestModalProps {
  visible: boolean;
  eventId: string;
  /** The current invitees, so someone already invited (and the host themselves)
      is filtered out of search results and refused by email. */
  invitees: EventInvitee[];
  /** The host's own id, so they can't invite themselves. */
  currentUserId?: string;
  onClose: () => void;
  /** Fired after an invite lands, so the detail screen re-pulls the guest list. */
  onInvited: () => void;
}

/**
 * A host's invite flow, in one modal: search people by name and tap to invite a
 * user, or type an address to invite anyone by email. It reuses the Discover
 * search idiom and the shared person row, so inviting a guest looks like finding
 * a person anywhere else in the app. An email invite writes a pending guest that
 * the person claims when they sign up with that address (no mail is sent).
 */
export default function InviteGuestModal({
  visible,
  eventId,
  invitees,
  currentUserId,
  onClose,
  onInvited,
}: InviteGuestModalProps) {
  const toast = useToast();
  const { loading: inviting, run } = useAsyncAction();
  const [email, setEmail] = useState('');

  // Everyone already invited, plus the host, are ineligible: an invitee row is
  // keyed by user id OR email, so this one set covers both invite kinds.
  const invited = new Set(invitees.map((i) => i.invitee_id));

  // The shared debounced people search, minus anyone already invited or the host.
  const { query, setQuery, results, reset } = useUserSearch(
    (u) => u.id !== currentUserId && !invited.has(u.id)
  );

  // Clear the fields each time the modal opens, so it never reopens mid-search.
  useEffect(() => {
    if (!visible) return;
    reset();
    setEmail('');
  }, [visible, reset]);

  const inviteUser = (user: User) =>
    run(async () => {
      await addEventInvitee(eventId, { user_id: user.id });
      toast.show('Guest added');
      onInvited();
      onClose();
    }, 'Could not add that guest');

  const inviteByEmail = () => {
    const address = email.trim();
    if (!EMAIL_RE.test(address)) {
      toast.show('Enter a valid email address', { type: 'error' });
      return;
    }
    if (invited.has(address)) {
      toast.show('That email is already invited', { type: 'error' });
      return;
    }
    run(async () => {
      await addEventInvitee(eventId, { email: address });
      toast.show(`Invited ${address}`);
      onInvited();
      onClose();
    }, 'Could not send that invite');
  };

  return (
    <ModalCard
      visible={visible}
      title="Invite guests"
      message="Add people by name, or invite anyone by email."
    >
      <UserSearchPicker
        query={query}
        onChangeQuery={setQuery}
        results={results}
        onPick={inviteUser}
      />

      <Text style={styles.divider}>or invite by email</Text>
      <FormInput
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <View style={styles.gap} />
      <ConfirmCancelButtons
        confirmTitle="Invite by email"
        onConfirm={inviteByEmail}
        loading={inviting}
        cancelTitle="Done"
        onCancel={onClose}
      />
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  divider: {
    ...Typography.bodySecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  gap: {
    height: Spacing.md,
  },
});
