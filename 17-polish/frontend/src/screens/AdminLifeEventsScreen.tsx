import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import CatalogRow from '../components/CatalogRow';
import { fetchLifeEvents } from '../services/api';
import type { LifeEvent } from '../services/api';

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
    <AdminCatalogScreen
      title="Life events"
      loading={loading}
      addLabel="New life event"
      onAdd={() => navigation.navigate('AdminLifeEventForm', {})}
      isEmpty={!!lifeEvents && lifeEvents.length === 0}
      empty={{
        icon: 'calendar-outline',
        title: 'No life events yet',
        subtitle: 'Add an occasion, or seed the taxonomy (see the step README).',
      }}
    >
      {lifeEvents?.map((lifeEvent: LifeEvent) => (
        <CatalogRow
          key={lifeEvent.id}
          icon="calendar-outline"
          title={lifeEvent.icon ? `${lifeEvent.icon}  ${lifeEvent.name}` : lifeEvent.name}
          accessibilityLabel={lifeEvent.name}
          description={lifeEvent.description}          onPress={() => navigation.navigate('AdminLifeEventForm', { lifeEvent })}
        />
      ))}
    </AdminCatalogScreen>
  );
}
