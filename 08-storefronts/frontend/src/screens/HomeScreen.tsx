import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import SectionHeader from '../components/SectionHeader';
import ApiStatus from '../components/ApiStatus';
import AsyncStatusLine from '../components/AsyncStatusLine';
import BirthdayPrompt from '../components/BirthdayPrompt';
import EmptyStateView from '../components/EmptyStateView';
import WishlistCard from '../components/WishlistCard';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import { fetchCurrentUser, updateProfile, fetchMyWishlists } from '../services/api';
import { clerkFullName, clerkPrimaryEmail } from '../utils/clerkName';
import { Spacing } from '../constants/ScreenStyles';

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
  const { lifeEventFor } = useLifeEvents();
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {wishlists?.slice(0, RAIL_LIMIT).map((wishlist) => (
            <View key={wishlist.id} style={styles.railCard}>
              <WishlistCard
                wishlist={wishlist}
                lifeEvent={lifeEventFor(wishlist.life_event_id)}
                onPress={() => navigation.navigate('WishlistDetail', { wishlistId: wishlist.id })}
              />
            </View>
          ))}
        </ScrollView>
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

const styles = StyleSheet.create({
  rail: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  // A single-use rail-card width — the home preview's own metric, not a
  // grid cell (My Stuff's grid computes its own widths)
  railCard: {
    width: 150,
  },
});
