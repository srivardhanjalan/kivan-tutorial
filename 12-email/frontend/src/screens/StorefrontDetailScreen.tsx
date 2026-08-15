import React, { useMemo, useState } from 'react';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import HeaderIconButton from '../components/HeaderIconButton';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import TileGrid from '../components/TileGrid';
import ProductCard from '../components/ProductCard';
import CategoryFilterModal from '../components/CategoryFilterModal';
import useFetch from '../hooks/useFetch';
import { fetchStorefrontProducts } from '../services/api';

/**
 * One store: its products in the same grid the wishes ride, each opening to a
 * product detail where it can be added to a wishlist. The store itself comes
 * through navigation (it's curated, nothing to refetch); only its products are
 * fetched, by id. A funnel appears when the store spans more than one category,
 * filtering the grid client-side to the picked one.
 */
export default function StorefrontDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'StorefrontDetail'>();
  const { storefront } = route.params;

  const { data: products, loading } = useFetch(() =>
    fetchStorefrontProducts(storefront.id)
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // The store's distinct categories, in the products' own display order —
  // derived from the fetched products themselves, so the filter needs no
  // extra fetch and can never list a category the grid can't show.
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const product of products ?? []) {
      if (!seen.includes(product.category)) seen.push(product.category);
    }
    return seen;
  }, [products]);

  const filteredProducts = selectedCategory
    ? (products ?? []).filter((product) => product.category === selectedCategory)
    : products ?? [];

  return (
    <FloatingHeaderLayout
      title={storefront.name}
      loading={loading}
      showBack
      headerRight={
        categories.length > 1 ? (
          <HeaderIconButton
            icon={selectedCategory ? 'funnel' : 'funnel-outline'}
            accessibilityLabel="Filter by category"
            onPress={() => setShowFilter(true)}
          />
        ) : undefined
      }
    >
      <SectionHeader title="Products" meta={filteredProducts.length} />
      {products && products.length === 0 ? (
        <EmptyStateView
          icon="pricetag-outline"
          title="No products yet"
          subtitle="This store has nothing to browse right now. Check back later."
        />
      ) : (
        <TileGrid>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => navigation.navigate('ProductDetail', { product })}
            />
          ))}
        </TileGrid>
      )}

      <CategoryFilterModal
        visible={showFilter}
        categories={categories}
        selected={selectedCategory}
        onSelect={(category) => {
          setSelectedCategory(category);
          setShowFilter(false);
        }}
        onClose={() => setShowFilter(false)}
      />
    </FloatingHeaderLayout>
  );
}
