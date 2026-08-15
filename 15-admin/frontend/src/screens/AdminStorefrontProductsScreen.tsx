import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import CatalogRow from '../components/CatalogRow';
import EmptyStateView from '../components/EmptyStateView';
import HeaderIconButton from '../components/HeaderIconButton';
import { fetchStorefrontProducts } from '../services/api';
import type { Product } from '../services/api';
import { formatCost } from '../utils/formatCost';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One store's products, admin side: each row opens the product's edit form, the
 * header + adds one under this store. The store is passed in (not refetched);
 * the list refetches on focus so a create, edit, or delete shows on return. A
 * product's photo is seed-owned, so a row created here shows the glyph until a
 * later step ships an uploader.
 */
export default function AdminStorefrontProductsScreen() {
  const navigation = useAppNavigation();
  const { storefront } = useAppRoute<'AdminStorefrontProducts'>().params;
  const { data: products, loading } = useFetch(
    () => fetchStorefrontProducts(storefront.id),
    { refetchOnFocus: true }
  );

  return (
    <FloatingHeaderLayout
      title={storefront.name}
      showBack
      loading={loading}
      headerRight={
        <HeaderIconButton
          icon="add"
          accessibilityLabel="New product"
          onPress={() => navigation.navigate('AdminProductForm', { storefront })}
        />
      }
    >
      {products && products.length === 0 ? (
        <EmptyStateView
          icon="pricetag-outline"
          title="No products yet"
          subtitle="Add a product to this store."
          actionLabel="New product"
          onAction={() => navigation.navigate('AdminProductForm', { storefront })}
        />
      ) : (
        <View style={styles.list}>
          {products?.map((product: Product) => (
            <CatalogRow
              key={product.id}
              icon="cube-outline"
              logoUrl={product.image_url}
              title={product.name}
              accessibilityLabel={product.name}
              description={product.description}
              meta={[{ icon: 'cash-outline', text: formatCost(product.price) }]}
              showChevron
              onPress={() => navigation.navigate('AdminProductForm', { storefront, product })}
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
