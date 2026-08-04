import React from 'react';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import DirectoryLayout from '../components/DirectoryLayout';
import CatalogRow from '../components/CatalogRow';
import { fetchBrands } from '../services/api';
import type { Brand } from '../services/api';

/** Group the flat, backend-ordered list into categories, then list the
    category names alphabetically. Each category keeps the backend's
    (display_order, name) order, since brands arrive already sorted. */
function groupByCategory(brands: Brand[]): [string, Brand[]][] {
  const groups: Record<string, Brand[]> = {};
  for (const brand of brands) {
    (groups[brand.category] ??= []).push(brand);
  }
  return Object.keys(groups)
    .sort()
    .map((category) => [category, groups[category]]);
}

/**
 * The real-store directory. Where the Wish Store lists a curated catalog of
 * placeholder products, this lists REAL brands grouped by category: tapping one
 * opens the in-app browser on its site, where you browse to a product and
 * scrape it into a wish. The brands are seeded reference data (one GET /brands
 * feeds every section), so this loads once on mount.
 */
export default function BrandsScreen() {
  const navigation = useAppNavigation();
  const { data: brands, loading } = useFetch(fetchBrands);

  const sections = groupByCategory(brands ?? []).map(([category, categoryBrands]) => ({
    key: category,
    title: category,
    count: categoryBrands.length,
    children: categoryBrands.map((brand) => (
      <CatalogRow
        key={brand.id}
        icon="globe-outline"
        logoUrl={brand.logo_url}
        title={brand.name}
        accessibilityLabel={`${brand.name}, ${brand.country}`}
        description={brand.description}
        meta={[{ icon: 'location-outline', text: brand.country }]}
        showChevron
        onPress={() => navigation.navigate('InAppBrowser', { brand })}
      />
    )),
  }));

  return (
    <DirectoryLayout
      title="Browse Stores"
      loading={loading}
      showBack
      sections={sections}
      isEmpty={!!brands && brands.length === 0}
      empty={{
        icon: 'globe-outline',
        title: 'No stores yet',
        subtitle: 'The store directory is empty. Seed it (see the step README) to browse real stores here.',
      }}
    />
  );
}
