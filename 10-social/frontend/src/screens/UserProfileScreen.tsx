import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import WishlistGrid from '../components/WishlistGrid';
import Avatar from '../components/Avatar';
import FollowButton from '../components/FollowButton';
import useFetch from '../hooks/useFetch';
import { fetchUser, fetchUserWishlists, fetchUserLovedWishlists } from '../services/api';
import { userDisplayName } from '../utils/userName';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import type { Wishlist } from '../services/api';

/** The avatar diameter on a profile header — this screen's own metric */
const PROFILE_AVATAR_SIZE = 88;

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

/** A titled group of wishlists with its empty fallback — the profile's own
    Wishlists and Loved sections are the same scaffold, differing only in their
    copy, so it lives here once. Null while loading: header shows 0, no grid. */
function WishlistSection({
  title,
  wishlists,
  onPress,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: {
  title: string;
  wishlists: Wishlist[] | null;
  onPress: (id: string) => void;
  emptyIcon: React.ComponentProps<typeof EmptyStateView>['icon'];
  emptyTitle: string;
  emptySubtitle: string;
}) {
  return (
    <>
      <SectionHeader title={title} meta={wishlists?.length ?? 0} />
      {wishlists && wishlists.length === 0 ? (
        <EmptyStateView icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        wishlists && <WishlistGrid wishlists={wishlists} onPressWishlist={onPress} />
      )}
    </>
  );
}

/**
 * A public profile: avatar and name, the follower/following counts (each taps
 * through to that list), a follow button for other users, and the two things
 * that make up their taste — the wishlists they own and the ones they've
 * loved. Everything refetches on focus, so a follow or a love shows on return.
 */
export default function UserProfileScreen() {
  const navigation = useAppNavigation();
  const { userId } = useAppRoute<'UserProfile'>().params;

  const { data: user, loading } = useFetch(() => fetchUser(userId), { refetchOnFocus: true });
  const { data: wishlists } = useFetch(() => fetchUserWishlists(userId), { refetchOnFocus: true });
  const { data: loved } = useFetch(() => fetchUserLovedWishlists(userId), { refetchOnFocus: true });

  const openWishlist = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });
  // push, not navigate: the graph is a drill-down (a profile's followers, one of
  // their profiles, and on), so each step stacks rather than collapsing back
  const openFollows = (mode: 'followers' | 'following') =>
    navigation.push('FollowList', { userId, mode });

  return (
    <FloatingHeaderLayout title={user ? userDisplayName(user) : ''} loading={loading} showBack>
      {user && (
        <>
          <View style={styles.header}>
            <Avatar imageUrl={user.image_url} name={userDisplayName(user)} size={PROFILE_AVATAR_SIZE} />
            <View style={styles.stats}>
              <Stat count={user.follower_count} label="Followers" onPress={() => openFollows('followers')} />
              <Stat count={user.following_count} label="Following" onPress={() => openFollows('following')} />
            </View>
            {/* is_following is null only on your own profile — no self-follow */}
            {user.is_following !== null && (
              <FollowButton userId={user.id} initialFollowing={user.is_following} />
            )}
          </View>

          <WishlistSection
            title="Wishlists"
            wishlists={wishlists}
            onPress={openWishlist}
            emptyIcon="gift-outline"
            emptyTitle="No wishlists yet"
            emptySubtitle="When they add a wishlist, it shows up here."
          />
          <WishlistSection
            title="Loved"
            wishlists={loved}
            onPress={openWishlist}
            emptyIcon="heart-outline"
            emptyTitle="Nothing loved yet"
            emptySubtitle="Wishlists they love will collect here."
          />
        </>
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.xxxl,
  },
  statCount: {
    ...Typography.sectionTitle,
  },
  statLabel: {
    ...Typography.bodySecondary,
    marginTop: Spacing.hairlineGap,
  },
});
