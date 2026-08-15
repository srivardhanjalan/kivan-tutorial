import React, { useState } from 'react';
// The imports below line up with WishlistDetailScreen only because both detail
// screens lean on the same already-shared primitives; there is no logic here to
// extract, so this run is kept out of jscpd's clone report.
// jscpd:ignore-start
import { Text, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EditDeleteHeaderButtons from '../components/EditDeleteHeaderButtons';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
// jscpd:ignore-end
import WishlistGrid from '../components/WishlistGrid';
import LifeEventDetailHero from '../components/LifeEventDetailHero';
import ImagePlaceholderGlyph from '../components/ImagePlaceholderGlyph';
import ConfirmModal from '../components/ConfirmModal';
import RsvpControl from '../components/RsvpControl';
import EventGuestList from '../components/EventGuestList';
import InviteGuestModal from '../components/InviteGuestModal';
import DetailAction from '../components/DetailAction';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import useAsyncAction from '../hooks/useAsyncAction';
import {
  fetchEvent,
  deleteEvent,
  updateRSVP,
  removeEventInvitee,
} from '../services/api';
import type { EventInvitee, RsvpChoice } from '../services/api';
import { inviteeDisplayName, userDisplayName } from '../utils/userName';
import { clerkPrimaryEmail } from '../utils/clerkName';
import formatEventDate from '../utils/formatEventDate';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One event: a pastel/image cover, its life event, date, location and
 * description; an invitee's own RSVP control; the guest list (hosts see
 * everyone and can invite/remove, guests see only who's confirmed going); and
 * the wishlists linked to it (tapping one opens it). A host sees edit and delete
 * in the header. On-screen changes (RSVP, invite, remove) re-pull the detail so
 * the guest list and RSVP always reflect the server.
 */
export default function EventDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'EventDetail'>();
  const { eventId } = route.params;
  const { user } = useUser();

  const { data: detail, loading, refetch } = useFetch(() => fetchEvent(eventId), {
    refetchOnFocus: true,
  });
  const { lifeEventFor } = useLifeEvents();
  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteEvent(eventId),
    'Could not delete this event'
  );
  const { loading: busy, run } = useAsyncAction();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<EventInvitee | null>(null);

  const event = detail?.event;
  const lifeEvent = event?.event_type ? lifeEventFor(event.event_type) : undefined;
  const openWishlist = (id: string) => navigation.navigate('WishlistDetail', { wishlistId: id });

  // My own invitee row is keyed by my user id, or by my email for an invite
  // addressed to it; either identifier is what the RSVP PATCH targets.
  const myEmail = clerkPrimaryEmail(user);
  const myInvitee = detail?.invitees.find(
    (i) => i.invitee_id === user?.id || i.invitee_id === myEmail
  );

  const changeRsvp = (choice: RsvpChoice) => {
    if (!myInvitee) return;
    run(async () => {
      await updateRSVP(eventId, myInvitee.invitee_id, choice);
      refetch();
    }, 'Could not update your RSVP');
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    run(async () => {
      await removeEventInvitee(eventId, removeTarget.invitee_id);
      setRemoveTarget(null);
      refetch();
    }, 'Could not remove that guest');
  };

  const isHost = !!detail?.is_host;
  // A host sees every guest; a guest sees only who's confirmed going.
  const guests = detail
    ? isHost
      ? detail.invitees
      : detail.invitees.filter((i) => i.rsvp_status === 'going')
    : [];

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
          <LifeEventDetailHero
            lifeEvent={lifeEvent}
            imageUrl={event.image_url}
            placeholder={<ImagePlaceholderGlyph size={Spacing.detailHeroGlyphSize} />}
          />

          <Text style={styles.meta}>{formatEventDate(event.event_date)}</Text>
          {event.location ? <Text style={styles.meta}>{event.location}</Text> : null}
          {detail.hosts.length > 0 && (
            <Text style={styles.meta}>Hosted by {userDisplayName(detail.hosts[0])}</Text>
          )}
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          {detail.is_invitee && (
            <>
              <SectionHeader title="Your RSVP" />
              <RsvpControl value={detail.my_rsvp_status} onChange={changeRsvp} busy={busy} />
            </>
          )}

          <SectionHeader title="Guests" meta={guests.length} />
          {isHost && (
            <DetailAction
              title="Invite guests"
              variant="secondary"
              onPress={() => setInviteOpen(true)}
            />
          )}
          {guests.length === 0 ? (
            <EmptyStateView
              icon="people-outline"
              title={isHost ? 'No guests yet' : 'No confirmed guests yet'}
              subtitle={
                isHost
                  ? 'Invite people by name or email.'
                  : 'Nobody has said yes yet.'
              }
            />
          ) : (
            <EventGuestList
              guests={guests}
              onRemove={isHost ? setRemoveTarget : undefined}
            />
          )}

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

      <InviteGuestModal
        visible={inviteOpen}
        eventId={eventId}
        invitees={detail?.invitees ?? []}
        currentUserId={user?.id}
        onClose={() => setInviteOpen(false)}
        onInvited={refetch}
      />

      <ConfirmModal
        visible={removeTarget !== null}
        title="Remove guest?"
        message={
          removeTarget
            ? `Remove ${inviteeDisplayName(removeTarget)} from this event?`
            : ''
        }
        confirmTitle="Remove"
        loading={busy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />

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
  meta: {
    ...Typography.bodySecondary,
    marginTop: Spacing.sm,
  },
  description: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
});
