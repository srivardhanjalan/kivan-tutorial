import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import FormInput from '../components/FormInput';
import SelectablePill from '../components/SelectablePill';
import UserRow from '../components/UserRow';
import UserRail from '../components/UserRailItem';
import WishlistRail from '../components/WishlistRail';
import useFetch from '../hooks/useFetch';
import useUserSearch from '../hooks/useUserSearch';
import {
  fetchPopularUsers,
  fetchPopularWishlists,
  fetchFollowers,
  fetchFollowing,
  fetchUserLovedWishlists,
} from '../services/api';
import type { User, Wishlist } from '../services/api';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

type Tab = 'discover' | 'following' | 'followers';

/** A load-failure state with a retry button, shown when a tab's fetch errored
    and it has nothing to fall back on. */
function RetryState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyStateView
      icon="cloud-offline-outline"
      title="Couldn't load"
      subtitle="Check your connection and try again."
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

/**
 * Discover: three floating-header tabs over the people/wishlist graph. Discover
 * is the popular feed (search people, a rail of the most-followed, and the
 * most-loved wishlists); Following is the people you follow and the wishlists
 * you love; Followers is the people who follow you. People show as a horizontal
 * avatar rail; each rail pulls to refresh and shows a retry state on failure.
 */
export default function DiscoverScreen() {
  const navigation = useAppNavigation();
  const { user } = useUser();
  const myId = user?.id ?? '';
  const { query, setQuery, results } = useUserSearch();

  const popular = useFetch(fetchPopularUsers);
  const popularWishlists = useFetch(fetchPopularWishlists);
  const following = useFetch(() => (myId ? fetchFollowing(myId) : Promise.resolve<User[]>([])));
  const followers = useFetch(() => (myId ? fetchFollowers(myId) : Promise.resolve<User[]>([])));
  const lovedLists = useFetch(() => (myId ? fetchUserLovedWishlists(myId) : Promise.resolve<Wishlist[]>([])));

  const [tab, setTab] = useState<Tab>('discover');
  const [refreshing, setRefreshing] = useState(false);
  // Each tab's fetch settles into a fresh array; clear the pull spinner when any
  // of them does (useFetch's refetch doesn't flip `loading`, so we watch data).
  useEffect(() => {
    setRefreshing(false);
  }, [popular.data, popularWishlists.data, following.data, followers.data, lovedLists.data]);

  const openProfile = (userId: string) => navigation.navigate('UserProfile', { userId });
  const openWishlist = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });

  const onRefresh = () => {
    setRefreshing(true);
    if (tab === 'discover') {
      popular.refetch();
      popularWishlists.refetch();
    } else if (tab === 'following') {
      following.refetch();
      lovedLists.refetch();
    } else {
      followers.refetch();
    }
  };

  const searching = query.trim().length > 0;

  return (
    <FloatingHeaderLayout title="Discover" scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.tabs}>
          <SelectablePill label="Discover" selected={tab === 'discover'} onPress={() => setTab('discover')} />
          <SelectablePill label="Following" selected={tab === 'following'} onPress={() => setTab('following')} />
          <SelectablePill label="Followers" selected={tab === 'followers'} onPress={() => setTab('followers')} />
        </View>

        {tab === 'discover' && (
          <>
            <FormInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search people by name"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searching ? (
              results.length === 0 ? (
                <EmptyStateView icon="search-outline" title="No one found" subtitle="Try a different name." />
              ) : (
                results.map((u) => <UserRow key={u.id} user={u} onPress={() => openProfile(u.id)} />)
              )
            ) : popular.error && !popular.data ? (
              <RetryState onRetry={popular.refetch} />
            ) : (
              <>
                <SectionHeader title="People to follow" />
                <UserRail users={popular.data ?? []} onPressUser={openProfile} />

                <SectionHeader title="Wishlists to love" />
                <WishlistRail wishlists={popularWishlists.data ?? []} onPressWishlist={openWishlist} />
              </>
            )}
          </>
        )}

        {tab === 'following' &&
          (following.error && !following.data ? (
            <RetryState onRetry={following.refetch} />
          ) : (
            <>
              <SectionHeader title="People you follow" />
              {(following.data ?? []).length === 0 ? (
                <EmptyStateView
                  icon="people-outline"
                  title="Not following anyone yet"
                  subtitle="Find people over in the Discover tab."
                />
              ) : (
                <UserRail users={following.data ?? []} onPressUser={openProfile} />
              )}

              <SectionHeader title="Wishlists you love" />
              <WishlistRail wishlists={lovedLists.data ?? []} onPressWishlist={openWishlist} />
            </>
          ))}

        {tab === 'followers' &&
          (followers.error && !followers.data ? (
            <RetryState onRetry={followers.refetch} />
          ) : (followers.data ?? []).length === 0 ? (
            <EmptyStateView
              icon="people-outline"
              title="No followers yet"
              subtitle="People who follow you will show up here."
            />
          ) : (
            <UserRail users={followers.data ?? []} onPressUser={openProfile} />
          ))}
      </ScrollView>
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.floatingHeaderContentPadding,
    paddingBottom: Spacing.scrollContentBottom,
    paddingHorizontal: Spacing.contentHorizontal,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});
