import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import ShareUserProfileModal from '../components/ShareUserProfileModal';
import CoverProfileHeader from '../components/CoverProfileHeader';
import CoverActionButton from '../components/CoverActionButton';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import WishlistCardRail, { ALL_WISHES } from '../components/WishlistCardRail';
import WishlistGrid from '../components/WishlistGrid';
import MasonryGrid from '../components/MasonryGrid';
import WishCard from '../components/WishCard';
import useFetch from '../hooks/useFetch';
import useOptimisticToggle from '../hooks/useOptimisticToggle';
import useWishOrigin from '../hooks/useWishOrigin';
import {
  fetchUser,
  fetchUserWishlists,
  fetchUserLovedWishlists,
  fetchWishes,
  followUser,
  unfollowUser,
} from '../services/api';
import type { UserWithCounts, Wishlist, Wish } from '../services/api';
import { userDisplayName } from '../utils/userName';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/** One tappable count in the header (Followers / Following). */
function Stat({ count, label, onPress }: { count: number; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      style={CommonScreenStyles.center}
    >
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * The profile body, mounted once the user is loaded. The follow control is a
 * heart floated on the cover with a follower-count badge; that same optimistic
 * toggle also feeds the tappable Followers count below, so the heart and the
 * stat move together (and the stat counts stay the drill-down into a user's
 * follow lists). The wishes lay out wish-forward: a rail of the user's
 * wishlists led by an All Items aggregate filters a masonry of their wishes,
 * assembled per-wishlist from the view-gated wishes reads. Their loved
 * wishlists follow in their own shelf.
 */
function ProfileBody({
  user,
  wishlists,
  loved,
  openWishlist,
  openFollows,
}: {
  user: UserWithCounts;
  wishlists: Wishlist[] | null;
  loved: Wishlist[] | null;
  openWishlist: (id: string) => void;
  openFollows: (mode: 'followers' | 'following') => void;
}) {
  const { originFor } = useWishOrigin();
  const [selectedId, setSelectedId] = useState<string>(ALL_WISHES);
  // The user's wishes, keyed by wishlist: the profile has no single all-wishes
  // read, so it fans the view-gated per-wishlist reads and stitches them (a
  // private list the viewer can't see returns nothing, so it drops out).
  const [wishesByList, setWishesByList] = useState<Record<string, Wish[]>>({});

  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 4 : width >= 600 ? 3 : 2;

  const {
    on: following,
    count: followerCount,
    loading: followLoading,
    toggle,
  } = useOptimisticToggle({
    initialOn: user.is_following ?? false,
    initialCount: user.follower_count,
    turnOn: () => followUser(user.id),
    turnOff: () => unfollowUser(user.id),
    errorMessage: 'Could not update follow',
  });

  useEffect(() => {
    if (!wishlists) return;
    let cancelled = false;
    Promise.all(
      wishlists.map((wl) =>
        fetchWishes(wl.id)
          .then((ws) => [wl.id, ws] as const)
          .catch(() => [wl.id, [] as Wish[]] as const)
      )
    ).then((entries) => {
      if (!cancelled) setWishesByList(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [wishlists]);

  const allWishes = (wishlists ?? []).flatMap((wl) => wishesByList[wl.id] ?? []);
  const displayedWishes = selectedId === ALL_WISHES ? allWishes : wishesByList[selectedId] ?? [];

  return (
    <>
      <CoverProfileHeader
        ownerId={user.id}
        coverPhoto={user.cover_photo}
        avatarUrl={user.image_url}
        name={userDisplayName(user)}
        bleed
        // is_following is null only on your own profile (no self-follow)
        overlay={
          user.is_following !== null ? (
            <CoverActionButton
              icon="heart-outline"
              activeIcon="heart"
              active={following}
              count={followerCount}
              loading={followLoading}
              onPress={toggle}
              accessibilityLabel={following ? 'Following' : 'Follow'}
            />
          ) : undefined
        }
      />

      <View style={styles.stats}>
        <Stat count={followerCount} label="Followers" onPress={() => openFollows('followers')} />
        <Stat count={user.following_count} label="Following" onPress={() => openFollows('following')} />
      </View>

      {wishlists && wishlists.length > 0 && (
        <WishlistCardRail
          wishlists={wishlists}
          selectedId={selectedId}
          onSelect={setSelectedId}
          aggregateLabel="All Items"
          aggregateOwnerId={user.id}
        />
      )}

      <SectionHeader title="Wishes" meta={displayedWishes.length} />
      {displayedWishes.length === 0 ? (
        <EmptyStateView
          icon="gift-outline"
          title="No wishes yet"
          subtitle="When they add wishes, they show up here."
        />
      ) : (
        <MasonryGrid
          data={displayedWishes}
          numColumns={numColumns}
          keyExtractor={(wish) => wish.id}
          // Another user's wishes are display-only, the same as on their
          // wishlist detail (there is no read-only wish detail to open into).
          renderItem={(wish) => <WishCard wish={wish} originLogo={originFor(wish)?.logoUrl} />}
        />
      )}

      <SectionHeader title="Loved" meta={loved?.length ?? 0} />
      {loved && loved.length === 0 ? (
        <EmptyStateView
          icon="heart-outline"
          title="Nothing loved yet"
          subtitle="Wishlists they love will collect here."
        />
      ) : (
        loved && <WishlistGrid wishlists={loved} onPressWishlist={openWishlist} />
      )}
    </>
  );
}

/**
 * A public profile: a cover-band header with the follow heart, the
 * follower/following counts (each taps through to that list), the user's
 * wishes laid out wish-forward, and the wishlists they've loved. Everything
 * refetches on focus, so returning reflects follows and loves made elsewhere.
 */
export default function UserProfileScreen() {
  const navigation = useAppNavigation();
  const { userId } = useAppRoute<'UserProfile'>().params;

  const { data: user, loading } = useFetch(() => fetchUser(userId), { refetchOnFocus: true });
  const { data: wishlists } = useFetch(() => fetchUserWishlists(userId), { refetchOnFocus: true });
  const { data: loved } = useFetch(() => fetchUserLovedWishlists(userId), { refetchOnFocus: true });
  const [showShare, setShowShare] = useState(false);

  const openWishlist = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });
  // push, not navigate: the graph is a drill-down (a profile's followers, one of
  // their profiles, and on), so each step stacks rather than collapsing back
  const openFollows = (mode: 'followers' | 'following') =>
    navigation.push('FollowList', { userId, mode });

  return (
    <FloatingHeaderLayout
      title={user ? userDisplayName(user) : ''}
      loading={loading}
      showBack
      headerRight={
        user ? (
          <HeaderIconButton
            icon="share-outline"
            accessibilityLabel="Share profile"
            onPress={() => setShowShare(true)}
          />
        ) : undefined
      }
    >
      {user && (
        <>
          <ProfileBody
            user={user}
            wishlists={wishlists}
            loved={loved}
            openWishlist={openWishlist}
            openFollows={openFollows}
          />

          <ShareUserProfileModal
            visible={showShare}
            userId={userId}
            userName={userDisplayName(user)}
            onClose={() => setShowShare(false)}
          />
        </>
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxxl,
    paddingVertical: Spacing.md,
  },
  statCount: {
    ...Typography.sectionTitle,
  },
  statLabel: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});
