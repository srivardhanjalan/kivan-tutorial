import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import WishlistGrid from '../components/WishlistGrid';
import EventRailCard from '../components/EventRailCard';
import PrimaryButton from '../components/PrimaryButton';
import AddTileCard from '../components/AddTileCard';
import useFetch from '../hooks/useFetch';
import { fetchMyWishlists, fetchMyEvents } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

/**
 * My Stuff: the grid of everything you own. Wishlists and the events you host
 * both load and refetch on focus, so a create or edit shows the moment you
 * return. Empty, each section points you at your first one; full, an add tile
 * leads the grid. Events you're invited to follow in their own section, each
 * tile carrying my RSVP, and only when there are any (no empty prompt to plan
 * someone else's event).
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
  const invited = myEvents?.invited ?? [];

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
        <>
          <View style={styles.addEvent}>
            <PrimaryButton title="New Event" variant="secondary" onPress={createEvent} />
          </View>
          {hosting.map((event) => (
            <EventRailCard
              key={event.id}
              event={event}
              isHosting
              onPress={() => openEvent(event.id)}
            />
          ))}
        </>
      )}

      {invited.length > 0 && (
        <>
          <SectionHeader title="Invited" meta={invited.length} />
          {invited.map((event) => (
            <EventRailCard
              key={event.id}
              event={event}
              isHosting={false}
              rsvp={event.my_rsvp_status}
              onPress={() => openEvent(event.id)}
            />
          ))}
        </>
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  addEvent: {
    marginBottom: Spacing.md,
  },
});
