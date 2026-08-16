import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import MasonryGrid from '../components/MasonryGrid';
import ProductCard from '../components/ProductCard';
import { fetchStorefrontProducts } from '../services/api';
import type { Product } from '../services/api';

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

  // Products lay out by their true image aspect ratios in a masonry, more
  // columns on a wider device — the same responsive rule the store detail uses.
  const { width } = useWindowDimensions();
  const productColumns = width >= 768 ? 4 : width >= 600 ? 3 : 2;

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
      <MasonryGrid
        data={products ?? []}
        numColumns={productColumns}
        keyExtractor={(product: Product) => product.id}
        renderItem={(product: Product) => (
          <ProductCard
            product={product}
            onPress={() => navigation.navigate('AdminProductForm', { storefront, product })}
          />
        )}
      />
    </AdminCatalogScreen>
  );
}
