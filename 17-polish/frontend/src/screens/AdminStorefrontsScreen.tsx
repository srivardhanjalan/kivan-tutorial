import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import TileGrid from '../components/TileGrid';
import StorefrontCard from '../components/StorefrontCard';
import { fetchStorefronts } from '../services/api';
import type { Storefront } from '../services/api';

/**
 * The curated store catalog, admin side: the same image-forward card grid the
 * Wish Store shows, each card opening the store's edit form and the header +
 * adding one. Refetches on focus so a change from the form (and the
 * product_count the product routes keep) shows on return. A store created here
 * shows the placeholder glyph until its logo is uploaded on the edit form.
 */
export default function AdminStorefrontsScreen() {
  const navigation = useAppNavigation();
  const { data: storefronts, loading } = useFetch(fetchStorefronts, { refetchOnFocus: true });

  return (
    <AdminCatalogScreen
      title="Storefronts"
      loading={loading}
      addLabel="New storefront"
      onAdd={() => navigation.navigate('AdminStorefrontForm', {})}
      isEmpty={!!storefronts && storefronts.length === 0}
      empty={{
        icon: 'storefront-outline',
        title: 'No storefronts yet',
        subtitle: 'Add a store, or seed the catalog (see the step README).',
      }}
    >
      <TileGrid>
        {storefronts?.map((storefront: Storefront) => (
          <StorefrontCard
            key={storefront.id}
            storefront={storefront}
            onPress={() => navigation.navigate('AdminStorefrontForm', { storefront })}
          />
        ))}
      </TileGrid>
    </AdminCatalogScreen>
  );
}
