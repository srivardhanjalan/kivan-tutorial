import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import SectionHeader from '../components/SectionHeader';
import ApiStatus from '../components/ApiStatus';
import AsyncStatusLine from '../components/AsyncStatusLine';
import BirthdayPrompt from '../components/BirthdayPrompt';
import EmptyStateView from '../components/EmptyStateView';
import useFetch from '../hooks/useFetch';
import { fetchCurrentUser, updateProfile } from '../services/api';
import type { RootStackParamList } from '../components/Navigation';

/** "First Last" → first → last → email — whatever the profile can offer. */
const displayName = (user: ReturnType<typeof useUser>['user']): string => {
  if (!user) return '';
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.firstName || user.lastName || user.emailAddresses[0]?.emailAddress || '';
};

/**
 * Home greets the signed-in user by name (from the Clerk profile) and shows
 * the backend's record of you. Refetches on focus so a Settings edit shows
 * the moment you come back. Real home content arrives with the collections
 * in step 07.
 */
export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useUser();
  const { data: backendUser, error, loading } = useFetch(fetchCurrentUser, {
    refetchOnFocus: true,
  });
  // Hides the prompt instantly on dismiss; the persisted flag covers next launch
  const [promptDismissed, setPromptDismissed] = useState(false);

  const showBirthdayPrompt =
    !!backendUser &&
    !backendUser.birthday &&
    !backendUser.birthday_prompt_dismissed &&
    !promptDismissed;

  const dismissBirthdayPrompt = () => {
    setPromptDismissed(true);
    updateProfile({ birthday_prompt_dismissed: true }).catch(() => {
      // Worst case the prompt returns next launch — not worth interrupting for
    });
  };

  return (
    <FloatingHeaderLayout
      title={`Hi, ${displayName(user)}`}
      headerRight={
        <HeaderIconButton
          icon="settings-outline"
          accessibilityLabel="Settings"
          onPress={() => navigation.navigate('Settings')}
        />
      }
    >
      {showBirthdayPrompt && (
        <BirthdayPrompt
          onAdd={() => navigation.navigate('Settings')}
          onDismiss={dismissBirthdayPrompt}
        />
      )}
      <SectionHeader title="Your account" />
      <ApiStatus />
      <AsyncStatusLine
        label="Record"
        loading={loading}
        error={error}
        value={
          backendUser
            ? `${backendUser.email} · provisioned ${new Date(backendUser.created_at).toLocaleDateString()}`
            : ''
        }
      />
      <EmptyStateView
        icon="home"
        title="Home is yours now"
        subtitle="Your wishlists will live here — they arrive with the collections step."
      />
    </FloatingHeaderLayout>
  );
}
