import React, { useState } from 'react';
// The imports below line up with WishlistDetailScreen only because both detail
// screens lean on the same already-shared primitives; there is no logic here to
// extract, so this run is kept out of jscpd's clone report.
// jscpd:ignore-start
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import DetailHeaderActions from '../components/DetailHeaderActions';
import ShareEventModal from '../components/ShareEventModal';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
// jscpd:ignore-end
import WishlistGrid from '../components/WishlistGrid';
import CoverPhoto from '../components/CoverPhoto';
import Avatar from '../components/Avatar';
import GlassPill from '../components/GlassPill';
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
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
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
  const [showShare, setShowShare] = useState(false);
  // The body switches between the linked wishlists and the guest list, one at a
  // time, under a segmented toggle.
  const [viewMode, setViewMode] = useState<'wishlists' | 'guests'>('wishlists');

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
        detail && event ? (
          <DetailHeaderActions
            shareLabel="Share event"
            onShare={() => setShowShare(true)}
            manage={
              detail.is_host
                ? {
                    subject: 'event',
                    onEdit: () => navigation.navigate('EventForm', { event }),
                    onDelete: requestDelete,
                  }
                : undefined
            }
          />
        ) : undefined
      }
    >
      {detail && event && (
        <>
          <CoverPhoto ownerId={event.created_by} coverPhoto={event.image_url}>
            {lifeEvent && (
              <GlassPill style={[styles.badge, styles.badgeTopLeft]}>
                {lifeEvent.icon ? <Text style={styles.badgeEmoji}>{lifeEvent.icon}</Text> : null}
                <Text style={styles.badgeText}>{lifeEvent.name}</Text>
              </GlassPill>
            )}
            <GlassPill style={[styles.badge, styles.badgeTopRight]}>
              <Ionicons name="calendar-outline" size={13} color={Colors.dark} />
              <Text style={styles.badgeText}>{formatEventDate(event.event_date)}</Text>
            </GlassPill>
            {event.location ? (
              <GlassPill style={[styles.badge, styles.badgeBottomLeft]}>
                <Ionicons name="location-outline" size={13} color={Colors.dark} />
                <Text style={styles.badgeText}>{event.location}</Text>
              </GlassPill>
            ) : null}
          </CoverPhoto>

          {detail.hosts.length > 0 && (
            <View style={styles.hostsRow}>
              <View style={styles.avatars}>
                {detail.hosts.slice(0, 5).map((host, i) => (
                  <View key={host.id} style={[styles.avatarRing, i > 0 && styles.avatarOverlap]}>
                    <Avatar imageUrl={host.image_url} name={userDisplayName(host)} size={32} />
                  </View>
                ))}
              </View>
              <Text style={styles.hostsLabel}>
                {detail.hosts.length === 1
                  ? `Hosted by ${userDisplayName(detail.hosts[0])}`
                  : `${detail.hosts.length} hosts`}
              </Text>
            </View>
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

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'wishlists' && styles.toggleBtnActive]}
              onPress={() => setViewMode('wishlists')}
              activeOpacity={Opacity.pressed}
              accessibilityRole="button"
              accessibilityLabel="Wishlists"
            >
              <Ionicons
                name="gift-outline"
                size={16}
                color={viewMode === 'wishlists' ? Colors.dark : Colors.textMuted}
              />
              <Text style={[styles.toggleText, viewMode === 'wishlists' && styles.toggleTextActive]}>
                Wishlists  {detail.wishlists.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'guests' && styles.toggleBtnActive]}
              onPress={() => setViewMode('guests')}
              activeOpacity={Opacity.pressed}
              accessibilityRole="button"
              accessibilityLabel="Guests"
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={viewMode === 'guests' ? Colors.dark : Colors.textMuted}
              />
              <Text style={[styles.toggleText, viewMode === 'guests' && styles.toggleTextActive]}>
                Guests  {guests.length}
              </Text>
            </TouchableOpacity>
          </View>

          {viewMode === 'wishlists' ? (
            detail.wishlists.length === 0 ? (
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
            )
          ) : (
            <>
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
                    isHost ? 'Invite people by name or email.' : 'Nobody has said yes yet.'
                  }
                />
              ) : (
                <EventGuestList guests={guests} onRemove={isHost ? setRemoveTarget : undefined} />
              )}
            </>
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

      {event && (
        <ShareEventModal
          visible={showShare}
          eventId={eventId}
          eventName={event.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  // Glass badges floating on the cover band.
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  badgeTopLeft: {
    top: Spacing.md,
    left: Spacing.md,
  },
  badgeTopRight: {
    top: Spacing.md,
    right: Spacing.md,
  },
  badgeBottomLeft: {
    bottom: Spacing.md,
    left: Spacing.md,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark,
  },
  hostsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  avatars: {
    flexDirection: 'row',
  },
  // A white ring so overlapping avatars read as separate discs.
  avatarRing: {
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -12,
  },
  hostsLabel: {
    ...Typography.bodySecondary,
    flex: 1,
  },
  description: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  // The wishlists/guests segmented control.
  toggle: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.subtleFill,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  toggleText: {
    ...Typography.bodySecondaryStrong,
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.dark,
  },
});
