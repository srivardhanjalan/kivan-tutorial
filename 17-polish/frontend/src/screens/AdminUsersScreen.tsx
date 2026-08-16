import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import PersonRow from '../components/PersonRow';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmModal from '../components/ConfirmModal';
import EmptyStateView from '../components/EmptyStateView';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { fetchAdminUsers, setUserRole } from '../services/api';
import type { Role, User } from '../services/api';
import { userDisplayName } from '../utils/userName';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/** The page size for the roster (the backend caps limit at 100). */
const PAGE_SIZE = 50;

/**
 * The user roster: every user, newest first, paged in on demand. Each row
 * promotes a user to admin or demotes one back, behind a confirm. The backend
 * refuses to let an admin demote themselves (a 409 that keeps the instance from
 * losing its last admin); that reason surfaces honestly on the toast.
 */
export default function AdminUsersScreen() {
  const toast = useToast();
  const { loading: acting, run } = useAsyncAction();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // The user whose role a confirm is pending on; its target role is the flip
  // of its current one.
  const [pending, setPending] = useState<User | null>(null);

  const load = async (offset: number) => {
    const page = await fetchAdminUsers(PAGE_SIZE, offset);
    setUsers((prev) => (offset === 0 ? page : [...prev, ...page]));
    // A short page means the table is exhausted; a full one may have more.
    setHasMore(page.length === PAGE_SIZE);
    setNextOffset(offset + page.length);
  };

  useEffect(() => {
    let live = true;
    fetchAdminUsers(PAGE_SIZE, 0)
      .then((page) => {
        if (!live) return;
        setUsers(page);
        setHasMore(page.length === PAGE_SIZE);
        setNextOffset(page.length);
      })
      .catch(() => live && toast.show('Could not load the roster', { type: 'error' }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // Setters, the toast handle: all stable, so this runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = () =>
    run(async () => {
      await load(nextOffset);
    }, 'Could not load more users');

  const confirmChange = () => {
    const target = pending;
    if (!target) return;
    const nextRole: Role = target.role === 'admin' ? 'user' : 'admin';
    run(async () => {
      const updated = await setUserRole(target.id, nextRole);
      // Replace the row in place with the server's record, so the label flips
      // without a reload.
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setPending(null);
    }, 'Could not change this user’s role');
  };

  const promoting = pending?.role !== 'admin';

  return (
    <FloatingHeaderLayout title="Users" loading={loading} showBack>
      {users.length === 0 ? (
        <EmptyStateView
          icon="people-outline"
          title="No users yet"
          subtitle="When people sign up, they show up here."
        />
      ) : (
        <>
          {users.map((user) => {
            const admin = user.role === 'admin';
            return (
              <PersonRow
                key={user.id}
                imageUrl={user.image_url ?? undefined}
                name={userDisplayName(user)}
                subtitle={admin ? `${user.email} · Admin` : user.email}
                trailing={
                  <TouchableOpacity
                    onPress={() => setPending(user)}
                    activeOpacity={Opacity.pressed}
                    accessibilityRole="button"
                    accessibilityLabel={
                      admin
                        ? `Remove admin from ${userDisplayName(user)}`
                        : `Make ${userDisplayName(user)} an admin`
                    }
                  >
                    <Text style={[styles.action, admin && styles.actionDanger]}>
                      {admin ? 'Remove admin' : 'Make admin'}
                    </Text>
                  </TouchableOpacity>
                }
              />
            );
          })}

          {hasMore && (
            <View style={styles.loadMore}>
              <PrimaryButton title="Load more" variant="secondary" onPress={loadMore} loading={acting} />
            </View>
          )}
        </>
      )}

      <ConfirmModal
        visible={pending !== null}
        title={promoting ? 'Make this user an admin?' : 'Remove admin?'}
        message={
          promoting
            ? 'They will see the admin dashboard and can change the catalog and other users’ roles.'
            : 'They will lose the admin dashboard and every admin action.'
        }
        confirmTitle={promoting ? 'Make admin' : 'Remove admin'}
        loading={acting}
        onConfirm={confirmChange}
        onCancel={() => setPending(null)}
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  action: {
    ...Typography.bodySecondaryStrong,
    color: Colors.primary,
  },
  actionDanger: {
    color: Colors.danger,
  },
  loadMore: {
    marginTop: Spacing.lg,
  },
});
