import React from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EmptyStateView from '../components/EmptyStateView';
import UserRow from '../components/UserRow';
import useFetch from '../hooks/useFetch';
import { fetchFollowers, fetchFollowing } from '../services/api';

/**
 * The people behind a profile's counts — one screen for both directions,
 * chosen by the `mode` param. Each row pushes that user's profile, so the graph
 * is walkable: a follower's followers, and on.
 */
export default function FollowListScreen() {
  const navigation = useAppNavigation();
  const { userId, mode } = useAppRoute<'FollowList'>().params;
  const followers = mode === 'followers';

  const { data: users, loading } = useFetch(() =>
    followers ? fetchFollowers(userId) : fetchFollowing(userId)
  );

  return (
    <FloatingHeaderLayout title={followers ? 'Followers' : 'Following'} loading={loading} showBack>
      {users && users.length === 0 ? (
        <EmptyStateView
          icon="people-outline"
          title={followers ? 'No followers yet' : 'Not following anyone'}
          subtitle={
            followers
              ? 'When someone follows them, they show up here.'
              : 'The people they follow will show up here.'
          }
        />
      ) : (
        users?.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            onPress={() => navigation.push('UserProfile', { userId: user.id })}
          />
        ))
      )}
    </FloatingHeaderLayout>
  );
}
