import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import FormInput from '../components/FormInput';
import UserRow from '../components/UserRow';
import WishlistRail from '../components/WishlistRail';
import useFetch from '../hooks/useFetch';
import useUserSearch from '../hooks/useUserSearch';
import { fetchPopularUsers, fetchPopularWishlists } from '../services/api';
import { pluralize } from '../utils/pluralize';

/**
 * Discover: find people to follow and wishlists to love. An empty box shows a
 * rail of the most-loved wishlists and the most-followed people; typing runs a
 * debounced name search over people. People rows open a profile (where the
 * follow lives); wishlist tiles open the wishlist (where the love lives).
 */
export default function DiscoverScreen() {
  const navigation = useAppNavigation();
  const { query, setQuery, results } = useUserSearch();
  const { data: popular } = useFetch(fetchPopularUsers);
  const { data: popularWishlists } = useFetch(fetchPopularWishlists);

  const openProfile = (userId: string) =>
    navigation.navigate('UserProfile', { userId });
  const openWishlist = (id: string) =>
    navigation.navigate('WishlistDetail', { wishlistId: id });

  const searching = query.trim().length > 0;

  return (
    <FloatingHeaderLayout title="Discover">
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
          <EmptyStateView
            icon="search-outline"
            title="No one found"
            subtitle="Try a different name."
          />
        ) : (
          results.map((user) => (
            <UserRow key={user.id} user={user} onPress={() => openProfile(user.id)} />
          ))
        )
      ) : (
        <>
          <SectionHeader title="Wishlists to love" />
          <WishlistRail wishlists={popularWishlists ?? []} onPressWishlist={openWishlist} />

          <SectionHeader title="People to follow" />
          {popular?.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              subtitle={pluralize(user.follower_count, 'follower')}
              onPress={() => openProfile(user.id)}
            />
          ))}
        </>
      )}
    </FloatingHeaderLayout>
  );
}
