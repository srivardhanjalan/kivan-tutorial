import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import TileGrid from '../components/TileGrid';
import WishlistCard from '../components/WishlistCard';
import AddTileCard from '../components/AddTileCard';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import { fetchMyWishlists } from '../services/api';

/**
 * My Stuff: the grid of everything you own. Wishlists load newest-first and
 * refetch on focus, so a create or edit shows the moment you return. Empty,
 * it points you at your first wishlist; full, an add tile leads the grid.
 */
export default function MyStuffScreen() {
  const navigation = useAppNavigation();
  const { data: wishlists, loading } = useFetch(fetchMyWishlists, { refetchOnFocus: true });
  // Icons are decorative here — render wishlists without blocking on the taxonomy
  const { lifeEventFor } = useLifeEvents();

  const create = () => navigation.navigate('WishlistForm', {});
  const open = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });

  return (
    <FloatingHeaderLayout title="My Stuff" loading={loading}>
      <SectionHeader title="Wishlists" meta={wishlists?.length ?? 0} />
      {wishlists && wishlists.length === 0 ? (
        <EmptyStateView
          icon="gift-outline"
          title="No wishlists yet"
          subtitle="Group the things you want by the occasion they're for."
          actionLabel="Create a wishlist"
          onAction={create}
        />
      ) : (
        <TileGrid>
          <AddTileCard label="New Wishlist" onPress={create} />
          {wishlists?.map((wishlist) => (
            <WishlistCard
              key={wishlist.id}
              wishlist={wishlist}
              lifeEvent={lifeEventFor(wishlist.life_event_id)}
              onPress={() => open(wishlist.id)}
            />
          ))}
        </TileGrid>
      )}
    </FloatingHeaderLayout>
  );
}
