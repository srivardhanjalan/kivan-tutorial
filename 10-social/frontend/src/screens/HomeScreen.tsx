import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import SectionHeader from '../components/SectionHeader';
import ApiStatus from '../components/ApiStatus';
import AsyncStatusLine from '../components/AsyncStatusLine';
import BirthdayPrompt from '../components/BirthdayPrompt';
import EmptyStateView from '../components/EmptyStateView';
import WishlistRail from '../components/WishlistRail';
import useFetch from '../hooks/useFetch';
import { fetchCurrentUser, updateProfile, fetchMyWishlists } from '../services/api';
import { clerkFullName, clerkPrimaryEmail } from '../utils/clerkName';

/** How many of the newest wishlists the home rail previews */
const RAIL_LIMIT = 6;

/**
 * Home greets the signed-in user by name (from the Clerk profile), previews
 * the newest wishlists in a rail that links into each, and shows the backend's
 * record of you. Everything refetches on focus so a change elsewhere shows the
 * moment you come back.
 */
export default function HomeScreen() {
  const navigation = useAppNavigation();
  const { user } = useUser();
  const { data: backendUser, error, loading } = useFetch(fetchCurrentUser, {
    refetchOnFocus: true,
  });
  const { data: wishlists } = useFetch(fetchMyWishlists, { refetchOnFocus: true });
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
      title={`Hi, ${clerkFullName(user) || clerkPrimaryEmail(user)}`}
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

      <SectionHeader title="Your wishlists" />
      {wishlists && wishlists.length === 0 ? (
        <EmptyStateView
          icon="gift-outline"
          title="No wishlists yet"
          subtitle="Create your first one over in My Stuff."
        />
      ) : (
        <WishlistRail
          wishlists={wishlists?.slice(0, RAIL_LIMIT) ?? []}
          onPressWishlist={(id) => navigation.navigate('WishlistDetail', { wishlistId: id })}
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
    </FloatingHeaderLayout>
  );
}
