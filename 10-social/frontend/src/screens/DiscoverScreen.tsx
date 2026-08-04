import React, { useEffect, useState } from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import FormInput from '../components/FormInput';
import UserRow from '../components/UserRow';
import WishlistRail from '../components/WishlistRail';
import useFetch from '../hooks/useFetch';
import { searchUsers, fetchPopularUsers, fetchPopularWishlists } from '../services/api';
import { pluralize } from '../utils/pluralize';
import type { User } from '../services/api';

/** How long the box sits still before a search fires — one request per pause,
    not per keystroke. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Discover: find people to follow and wishlists to love. An empty box shows a
 * rail of the most-loved wishlists and the most-followed people; typing runs a
 * debounced name search over people. People rows open a profile (where the
 * follow lives); wishlist tiles open the wishlist (where the love lives).
 */
export default function DiscoverScreen() {
  const navigation = useAppNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const { data: popular } = useFetch(fetchPopularUsers);
  const { data: popularWishlists } = useFetch(fetchPopularWishlists);

  // Debounced search: a trimmed query fires one request after the pause; an
  // empty box clears results and falls back to the popular rail below.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(trimmed)
        .then(setResults)
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

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
