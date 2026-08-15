import React, { useCallback, useRef, useState } from 'react';
import formatUnreadCount from '../utils/formatUnreadCount';
import NOTIFICATION_TYPE_ICON from '../constants/notificationTypeIcons';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import EmptyStateView from '../components/EmptyStateView';
import ConfirmModal from '../components/ConfirmModal';
import Avatar, { LIST_ROW_AVATAR_SIZE } from '../components/Avatar';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/api';
import type { NotificationType, NotificationWithActor } from '../services/api';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';
import { ChromeMaxFontSizeMultiplier } from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';
import BorderRadius from '../constants/BorderRadius';

/** The page size for the feed's infinite scroll (the backend caps limit at 50). */
const PAGE_SIZE = 20;

/** The accent behind each type's badge icon. `follow` reuses the brand color;
    the other three are named tokens (their colors have one home in Colors). */
const TYPE_COLOR: Record<NotificationType, string> = {
  follow: Colors.primary,
  wishlist_created: Colors.notifyWishlistCreated,
  wish_added: Colors.notifyWishAdded,
  wishlist_loved: Colors.notifyWishlistLoved,
};

/**
 * A notification's age in words: "Just now", "5m ago", "3h ago", "2d ago", or a
 * date once it's older than a week. created_at is offset-aware ISO (the backend
 * stamps UTC with a +00:00 offset), so `new Date` parses it correctly with no
 * normalization. A clock skew that would read as the future collapses to
 * "Just now".
 */
function timeAgo(createdAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(createdAt).toLocaleDateString();
}

/** One tappable notification: the actor's avatar badged with the type icon, the
    message, and its age. Long-press opens the delete confirm; an unread row
    reads bolder with a dot. */
const NotificationRow: React.FC<{
  item: NotificationWithActor;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ item, onPress, onLongPress }) => {
  const name =
    [item.actor.first_name, item.actor.last_name].filter(Boolean).join(' ') || 'Someone';
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={item.message}
      style={styles.row}
    >
      <View>
        <Avatar imageUrl={item.actor.image_url} name={name} size={LIST_ROW_AVATAR_SIZE} />
        <View style={[styles.typeBadge, { backgroundColor: TYPE_COLOR[item.notification_type] }]}>
          <Ionicons name={NOTIFICATION_TYPE_ICON[item.notification_type]} size={13} color={Colors.white} />
        </View>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.message, !item.read && styles.messageUnread]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

/**
 * The notifications feed: the caller's notifications newest-first, reloaded on
 * every focus and paged in as you scroll. A tap marks the row read (optimistic)
 * and opens what it points at: a follow to the actor's profile, a wishlist or
 * love to that wishlist, a new wish to the wishlist it landed in. The header
 * carries an unread pill and a mark-all-read action; a long-press deletes a row.
 */
export default function NotificationsScreen() {
  const toast = useToast();
  const navigation = useAppNavigation();
  const { loading: acting, run } = useAsyncAction();

  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NotificationWithActor | null>(null);
  // Guards against overlapping loads (rapid onEndReached firings, a refresh
  // landing over the focus reload).
  const loadingRef = useRef(false);

  const load = async (offset = 0) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (offset === 0) setLoading(true);
    try {
      const res = await fetchNotifications(PAGE_SIZE, offset);
      setNotifications((prev) =>
        offset === 0 ? res.notifications : [...prev, ...res.notifications]
      );
      setTotal(res.total);
      setUnreadCount(res.unread_count);
      setHasMore(res.has_more);
      setNextOffset(res.next_offset);
    } catch {
      toast.show('Could not load your notifications', { type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  };

  // Reload on focus: notifications a producer wrote while you were elsewhere
  // (or read on another screen) show fresh whenever you return to the tab.
  useFocusEffect(
    useCallback(() => {
      load(0);
      // load closes over only stable references (state setters, the guard ref,
      // the toast handle), so re-running it every focus needs no deps
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(0);
  };

  const loadMore = () => {
    if (hasMore && !loadingRef.current && nextOffset !== null) {
      load(nextOffset);
    }
  };

  const handlePress = (item: NotificationWithActor) => {
    // Optimistic: flip the row read and drop the unread count now, then tell
    // the server. The tap already committed to opening the target, so a failed
    // mark-read isn't worth interrupting it; the next focus reload reconciles.
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(item.id).catch(() => {});
    }

    if (item.notification_type === 'follow') {
      navigation.navigate('UserProfile', { userId: item.actor.id });
      return;
    }
    // wish_added points at a wish, so its list is resource.wishlist_id; the
    // wishlist types point at the wishlist itself (resource.id). A missing
    // resource (deleted since the notification fired) is a silent no-op.
    const wishlistId =
      item.notification_type === 'wish_added'
        ? item.resource?.wishlist_id
        : item.resource?.id;
    if (wishlistId) {
      navigation.navigate('WishlistDetail', { wishlistId });
    }
  };

  const handleMarkAllRead = () =>
    run(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.show('All notifications marked as read');
    }, 'Could not mark all as read');

  const confirmDelete = () => {
    const target = pendingDelete;
    if (!target) return;
    run(async () => {
      await deleteNotification(target.id);
      setNotifications((prev) => prev.filter((n) => n.id !== target.id));
      setTotal((t) => Math.max(0, t - 1));
      if (!target.read) setUnreadCount((c) => Math.max(0, c - 1));
      setPendingDelete(null);
    }, 'Could not delete the notification');
  };

  return (
    <FloatingHeaderLayout
      title="Notifications"
      scroll={false}
      loading={loading && notifications.length === 0}
      headerRight={
        unreadCount > 0 ? (
          <View style={styles.headerActions}>
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText} maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier}>
                {formatUnreadCount(unreadCount)}
              </Text>
            </View>
            <HeaderIconButton
              icon="checkmark-done-outline"
              accessibilityLabel="Mark all read"
              onPress={handleMarkAllRead}
            />
          </View>
        ) : undefined
      }
    >
      {total === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyStateView
            icon="notifications-outline"
            title="No notifications"
            subtitle="When you get notifications, they will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              progressViewOffset={Spacing.floatingHeaderContentPadding}
            />
          }
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={() => handlePress(item)}
              onLongPress={() => setPendingDelete(item)}
            />
          )}
        />
      )}

      <ConfirmModal
        visible={pendingDelete !== null}
        title="Delete notification?"
        message="This removes it from your feed. This cannot be undone."
        confirmTitle="Delete"
        loading={acting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    paddingTop: Spacing.floatingHeaderContentPadding,
  },
  listContent: {
    paddingTop: Spacing.floatingHeaderContentPadding,
    paddingBottom: Spacing.scrollContentBottom,
    paddingHorizontal: Spacing.contentHorizontal,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  rowText: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    color: Colors.dark,
  },
  messageUnread: {
    fontWeight: '600',
  },
  time: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.hairlineGap,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  unreadPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadPillText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
