import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import BrandWall from '../components/BrandWall';
import { fetchBrands } from '../services/api';

/**
 * The brand directory, admin side: the same image-forward logo wall the public
 * directory shows, each tile opening the brand's edit form and the header +
 * adding one. Refetches on focus so a create, edit, or delete from the form
 * shows the moment you return. A brand created here shows its name (the logo
 * wall's no-logo fallback) until a logo is uploaded on the edit form.
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
      <BrandWall
        brands={brands ?? []}
        onPressBrand={(brand) => navigation.navigate('AdminBrandForm', { brand })}
      />
    </AdminCatalogScreen>
  );
}
