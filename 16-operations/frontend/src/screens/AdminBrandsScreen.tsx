import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import CatalogRow from '../components/CatalogRow';
import { fetchBrands } from '../services/api';
import type { Brand } from '../services/api';

/**
 * The brand directory, admin side: every real store, tapping a row to edit it
 * and a header + to add one. Refetches on focus so a create, edit, or delete
 * from the form shows the moment you return. A brand's logo is seed-owned, so a
 * row created here shows the glyph until a later step ships an uploader.
 */
export default function AdminBrandsScreen() {
  const navigation = useAppNavigation();
  const { data: brands, loading } = useFetch(fetchBrands, { refetchOnFocus: true });

  return (
    <AdminCatalogScreen
      title="Brands"
      loading={loading}
      addLabel="New brand"
      onAdd={() => navigation.navigate('AdminBrandForm', {})}
      isEmpty={!!brands && brands.length === 0}
      empty={{
        icon: 'pricetags-outline',
        title: 'No brands yet',
        subtitle: 'Add a brand, or seed the directory (see the step README).',
      }}
    >
      {brands?.map((brand: Brand) => (
        <CatalogRow
          key={brand.id}
          icon="pricetag-outline"
          logoUrl={brand.logo_url}
          title={brand.name}
          accessibilityLabel={brand.name}
          description={brand.description}
          meta={[{ icon: 'globe-outline', text: brand.country }]}
          showChevron
          onPress={() => navigation.navigate('AdminBrandForm', { brand })}
        />
      ))}
    </AdminCatalogScreen>
  );
}
