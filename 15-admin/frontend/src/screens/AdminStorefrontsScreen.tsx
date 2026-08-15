import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import StorefrontCatalogRow from '../components/StorefrontCatalogRow';
import { fetchStorefronts } from '../services/api';
import type { Storefront } from '../services/api';

/**
 * The curated store catalog, admin side: each row opens the store's edit form,
 * the header + adds one. Refetches on focus so a change from the form (and the
 * product_count the product routes keep) shows on return. A store's logo is
 * seed-owned, so a row created here shows the glyph until a later step ships an
 * uploader.
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
      {storefronts?.map((storefront: Storefront) => (
        <StorefrontCatalogRow
          key={storefront.id}
          storefront={storefront}
          showChevron
          onPress={() => navigation.navigate('AdminStorefrontForm', { storefront })}
        />
      ))}
    </AdminCatalogScreen>
  );
}
