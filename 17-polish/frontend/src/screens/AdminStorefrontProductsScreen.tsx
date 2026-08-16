import React from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import ProductMasonry from '../components/ProductMasonry';
import { fetchStorefrontProducts } from '../services/api';

/**
 * One store's products, admin side: the same masonry of image-forward product
 * tiles the store detail shows, each tile opening the product's edit form and
 * the header + adding one under this store. The store is passed in (not
 * refetched); the list refetches on focus so a create, edit, or delete shows on
 * return. A product created here shows the placeholder glyph until its photo is
 * uploaded on the edit form.
 */
export default function AdminStorefrontProductsScreen() {
  const navigation = useAppNavigation();
  const { storefront } = useAppRoute<'AdminStorefrontProducts'>().params;
  const { data: products, loading } = useFetch(
    () => fetchStorefrontProducts(storefront.id),
    { refetchOnFocus: true }
  );

  return (
    <AdminCatalogScreen
      title={storefront.name}
      loading={loading}
      addLabel="New product"
      onAdd={() => navigation.navigate('AdminProductForm', { storefront })}
      isEmpty={!!products && products.length === 0}
      empty={{
        icon: 'pricetag-outline',
        title: 'No products yet',
        subtitle: 'Add a product to this store.',
      }}
    >
      <ProductMasonry
        products={products ?? []}
        onPressProduct={(product) => navigation.navigate('AdminProductForm', { storefront, product })}
      />
    </AdminCatalogScreen>
  );
}
