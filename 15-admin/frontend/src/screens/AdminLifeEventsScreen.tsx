import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import CatalogRow from '../components/CatalogRow';
import EmptyStateView from '../components/EmptyStateView';
import HeaderIconButton from '../components/HeaderIconButton';
import { fetchLifeEvents } from '../services/api';
import type { LifeEvent } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

/**
 * The life-events taxonomy, admin side: the occasions a wishlist is tagged
 * with. Tapping a row edits it, the header + adds one. Refetches on focus so a
 * change from the form shows on return. An id is the slug the frontend selector
 * matches on, so it is fixed once created.
 */
export default function AdminLifeEventsScreen() {
  const navigation = useAppNavigation();
  const { data: lifeEvents, loading } = useFetch(fetchLifeEvents, { refetchOnFocus: true });

  return (
    <FloatingHeaderLayout
      title="Life events"
      showBack
      loading={loading}
      headerRight={
        <HeaderIconButton
          icon="add"
          accessibilityLabel="New life event"
          onPress={() => navigation.navigate('AdminLifeEventForm', {})}
        />
      }
    >
      {lifeEvents && lifeEvents.length === 0 ? (
        <EmptyStateView
          icon="calendar-outline"
          title="No life events yet"
          subtitle="Add an occasion, or seed the taxonomy (see the step README)."
          actionLabel="New life event"
          onAction={() => navigation.navigate('AdminLifeEventForm', {})}
        />
      ) : (
        <View style={styles.list}>
          {lifeEvents?.map((lifeEvent: LifeEvent) => (
            <CatalogRow
              key={lifeEvent.id}
              icon="calendar-outline"
              title={lifeEvent.icon ? `${lifeEvent.icon}  ${lifeEvent.name}` : lifeEvent.name}
              accessibilityLabel={lifeEvent.name}
              description={lifeEvent.description}
              showChevron
              onPress={() => navigation.navigate('AdminLifeEventForm', { lifeEvent })}
            />
          ))}
        </View>
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
