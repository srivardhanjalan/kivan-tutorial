import React from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import TileGrid from '../components/TileGrid';
import ProductCard from '../components/ProductCard';
import useFetch from '../hooks/useFetch';
import { fetchStorefrontProducts } from '../services/api';

/**
 * One store: its products in the same grid the wishes ride, each opening to a
 * product detail where it can be added to a wishlist. The store itself comes
 * through navigation (it's curated, nothing to refetch); only its products are
 * fetched, by id.
 */
export default function StorefrontDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'StorefrontDetail'>();
  const { storefront } = route.params;

  const { data: products, loading } = useFetch(() =>
    fetchStorefrontProducts(storefront.id)
  );

  return (
    <FloatingHeaderLayout title={storefront.name} loading={loading} showBack>
      <SectionHeader title="Products" meta={products?.length ?? 0} />
      {products && products.length === 0 ? (
        <EmptyStateView
          icon="pricetag-outline"
          title="No products yet"
          subtitle="This store has nothing to browse right now. Check back later."
        />
      ) : (
        <TileGrid>
          {products?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => navigation.navigate('ProductDetail', { product })}
            />
          ))}
        </TileGrid>
      )}
    </FloatingHeaderLayout>
  );
}
