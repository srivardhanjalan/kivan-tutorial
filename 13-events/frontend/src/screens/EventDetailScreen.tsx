import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EditDeleteHeaderButtons from '../components/EditDeleteHeaderButtons';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import WishlistGrid from '../components/WishlistGrid';
import ArtTile from '../components/ArtTile';
import ImagePlaceholderGlyph from '../components/ImagePlaceholderGlyph';
import ConfirmModal from '../components/ConfirmModal';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import { fetchEvent, deleteEvent } from '../services/api';
import { userDisplayName } from '../utils/userName';
import formatEventDate from '../utils/formatEventDate';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One event: a pastel/image cover, its life event, date, location and
 * description, then the wishlists linked to it (tapping one opens it). A host
 * sees edit and delete in the header; the guest list and RSVP arrive with the
 * invitee step. Everything refetches on focus so a change shows on return.
 */
export default function EventDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'EventDetail'>();
  const { eventId } = route.params;

  const { data: detail, loading } = useFetch(() => fetchEvent(eventId), {
    refetchOnFocus: true,
  });
  const { lifeEventFor } = useLifeEvents();
  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteEvent(eventId),
    'Could not delete this event'
  );

  const event = detail?.event;
  const lifeEvent = event?.event_type ? lifeEventFor(event.event_type) : undefined;
  const openWishlist = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });

  return (
    <FloatingHeaderLayout
      title={event?.name ?? ''}
      loading={loading}
      showBack
      headerRight={
        detail && detail.is_host ? (
          <EditDeleteHeaderButtons
            subject="event"
            onEdit={() => navigation.navigate('EventForm', { event })}
            onDelete={requestDelete}
          />
        ) : undefined
      }
    >
      {detail && event && (
        <>
          <ArtTile
            height={Spacing.detailHeroHeight}
            color={pastelForLifeEvent(event.event_type ?? '')}
            imageUrl={event.image_url}
            placeholder={<ImagePlaceholderGlyph size={Spacing.detailHeroGlyphSize} />}
          />
          {lifeEvent && <Text style={styles.eventType}>{lifeEvent.name}</Text>}

          <Text style={styles.meta}>{formatEventDate(event.event_date)}</Text>
          {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}
          {detail.hosts.length > 0 && (
            <Text style={styles.meta}>Hosted by {userDisplayName(detail.hosts[0])}</Text>
          )}
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          <SectionHeader title="Wishlists" meta={detail.wishlists.length} />
          {detail.wishlists.length === 0 ? (
            <EmptyStateView
              icon="gift-outline"
              title="No wishlists yet"
              subtitle={
                detail.is_host
                  ? 'Link a wishlist you own when you edit this event.'
                  : "This event doesn't have any wishlists yet."
              }
            />
          ) : (
            <WishlistGrid wishlists={detail.wishlists} onPressWishlist={openWishlist} />
          )}
        </>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete event?"
        message="This removes the event and unlinks its wishlists. This cannot be undone."
        confirmTitle="Delete Event"
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  eventType: {
    ...Typography.bodySecondary,
    marginTop: Spacing.md,
  },
  meta: {
    ...Typography.bodySecondary,
    marginTop: Spacing.sm,
  },
  description: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
});
