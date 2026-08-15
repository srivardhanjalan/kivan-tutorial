import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import WishlistGrid from '../components/WishlistGrid';
import TileGrid from '../components/TileGrid';
import EventCard from '../components/EventCard';
import AddTileCard from '../components/AddTileCard';
import useFetch from '../hooks/useFetch';
import { fetchMyWishlists, fetchMyEvents } from '../services/api';

/**
 * My Stuff: the grid of everything you own. Wishlists and the events you host
 * both load and refetch on focus, so a create or edit shows the moment you
 * return. Empty, each section points you at your first one; full, an add tile
 * leads the grid.
 */
export default function MyStuffScreen() {
  const navigation = useAppNavigation();
  const { data: wishlists, loading } = useFetch(fetchMyWishlists, { refetchOnFocus: true });
  const { data: myEvents } = useFetch(fetchMyEvents, { refetchOnFocus: true });

  const createWishlist = () => navigation.navigate('WishlistForm', {});
  const openWishlist = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });
  const createEvent = () => navigation.navigate('EventForm', {});
  const openEvent = (id: string) => navigation.navigate('EventDetail', { eventId: id });

  const hosting = myEvents?.hosting ?? [];

  return (
    <FloatingHeaderLayout title="My Stuff" loading={loading}>
      <SectionHeader title="Wishlists" meta={wishlists?.length ?? 0} />
      {wishlists && wishlists.length === 0 ? (
        <EmptyStateView
          icon="gift-outline"
          title="No wishlists yet"
          subtitle="Group the things you want by the occasion they're for."
          actionLabel="Create a wishlist"
          onAction={createWishlist}
        />
      ) : (
        <WishlistGrid
          wishlists={wishlists ?? []}
          onPressWishlist={openWishlist}
          leading={<AddTileCard label="New Wishlist" onPress={createWishlist} />}
        />
      )}

      <SectionHeader title="Events" meta={hosting.length} />
      {myEvents && hosting.length === 0 ? (
        <EmptyStateView
          icon="calendar-outline"
          title="No events yet"
          subtitle="Plan an occasion and link the wishlists people can shop from."
          actionLabel="Create an event"
          onAction={createEvent}
        />
      ) : (
        <TileGrid>
          <AddTileCard label="New Event" onPress={createEvent} />
          {hosting.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => openEvent(event.id)} />
          ))}
        </TileGrid>
      )}
    </FloatingHeaderLayout>
  );
}
