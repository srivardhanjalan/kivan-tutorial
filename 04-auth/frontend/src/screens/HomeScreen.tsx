import React from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import SectionHeader from '../components/SectionHeader';
import ApiStatus from '../components/ApiStatus';
import AsyncStatusLine from '../components/AsyncStatusLine';
import EmptyStateView from '../components/EmptyStateView';
import useFetchOnMount from '../hooks/useFetchOnMount';
import { fetchCurrentUser } from '../services/api';
import { getUserDisplayName } from '../utils/userHelpers';

/**
 * Home greets the signed-in user by name (from the Clerk profile) and shows
 * the proof of this step: the backend's own record of you, JIT-provisioned
 * by the very request that fetches it. Real home content arrives with the
 * collections in step 07.
 */
export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { data: backendUser, error, loading } = useFetchOnMount(fetchCurrentUser);

  return (
    <FloatingHeaderLayout
      title={`Hi, ${getUserDisplayName(user)}`}
      headerRight={<HeaderIconButton icon="log-out-outline" onPress={() => signOut()} />}
    >
      <SectionHeader title="Your account" />
      <ApiStatus />
      <AsyncStatusLine
        label="Record"
        loading={loading}
        error={error}
        value={
          backendUser
            ? `${backendUser.email} · provisioned ${new Date(backendUser.created_at).toLocaleDateString()}`
            : ''
        }
      />
      <EmptyStateView
        icon="home"
        title="Home is yours now"
        subtitle="Your wishlists will live here — they arrive with the collections step."
      />
    </FloatingHeaderLayout>
  );
}
