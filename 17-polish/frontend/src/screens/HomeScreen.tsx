import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import CoverProfileHeader from '../components/CoverProfileHeader';
import CoverActionButton from '../components/CoverActionButton';
import SectionHeader from '../components/SectionHeader';
import BirthdayPrompt from '../components/BirthdayPrompt';
import EmptyStateView from '../components/EmptyStateView';
import WishlistCardRail, { ALL_WISHES } from '../components/WishlistCardRail';
import MasonryGrid from '../components/MasonryGrid';
import WishCard from '../components/WishCard';
import useFetch from '../hooks/useFetch';
import useWishOrigin from '../hooks/useWishOrigin';
import { fetchCurrentUser, updateProfile, fetchMyWishlists, fetchMyWishes } from '../services/api';
import { clerkFullName, clerkPrimaryEmail } from '../utils/clerkName';

/**
 * Home: a cover-band header greeting the signed-in user, a rail of their
 * wishlists led by an All Wishes aggregate (and an add tile) that filters the
 * feed, and the feed itself — a masonry of their image-forward wishes.
 * Everything refetches on focus so a change elsewhere shows the moment you
 * come back.
 */
export default function HomeScreen() {
  const navigation = useAppNavigation();
  const { user } = useUser();
  const { data: backendUser } = useFetch(fetchCurrentUser, { refetchOnFocus: true });
  const { data: wishlists } = useFetch(fetchMyWishlists, { refetchOnFocus: true });
  const { data: wishes } = useFetch(fetchMyWishes, { refetchOnFocus: true });
  const { originFor } = useWishOrigin();

  // Hides the prompt instantly on dismiss; the persisted flag covers next launch
  const [promptDismissed, setPromptDismissed] = useState(false);
  // The rail's selection filters the feed: the aggregate shows every wish, a
  // wishlist shows only its own.
  const [selectedId, setSelectedId] = useState<string>(ALL_WISHES);

  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 4 : width >= 600 ? 3 : 2;

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

  const displayedWishes =
    selectedId === ALL_WISHES ? wishes ?? [] : (wishes ?? []).filter((w) => w.wishlist_id === selectedId);

  return (
    <FloatingHeaderLayout title="">
      {user && (
        <CoverProfileHeader
          ownerId={user.id}
          coverPhoto={backendUser?.cover_photo}
          avatarUrl={backendUser?.image_url ?? user.imageUrl}
          name={clerkFullName(user) || clerkPrimaryEmail(user)}
          overlay={
            <CoverActionButton
              icon="settings-outline"
              accessibilityLabel="Settings"
              onPress={() => navigation.navigate('Settings')}
            />
          }
        />
      )}

      {showBirthdayPrompt && (
        <BirthdayPrompt
          onAdd={() => navigation.navigate('Settings')}
          onDismiss={dismissBirthdayPrompt}
        />
      )}

      {user && (
        <WishlistCardRail
          wishlists={wishlists ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          aggregateLabel="All Wishes"
          aggregateOwnerId={user.id}
          onAdd={() => navigation.navigate('WishlistForm', {})}
        />
      )}

      <SectionHeader title="Wishes" meta={displayedWishes.length} />
      {wishes && displayedWishes.length === 0 ? (
        <EmptyStateView
          icon="sparkles-outline"
          title="No wishes yet"
          subtitle={
            (wishlists?.length ?? 0) === 0
              ? 'Create your first wishlist over in My Stuff, then add the things you want.'
              : 'Open a wishlist to add the things you want.'
          }
        />
      ) : (
        <MasonryGrid
          data={displayedWishes}
          numColumns={numColumns}
          keyExtractor={(wish) => wish.id}
          renderItem={(wish) => (
            <WishCard
              wish={wish}
              originLogo={originFor(wish)?.logoUrl}
              onPress={() => navigation.navigate('WishDetail', { wishId: wish.id })}
            />
          )}
        />
      )}
    </FloatingHeaderLayout>
  );
}
