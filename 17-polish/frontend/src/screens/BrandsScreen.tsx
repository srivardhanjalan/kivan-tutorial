import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import DirectoryLayout from '../components/DirectoryLayout';
import BrandLogoCard from '../components/BrandLogoCard';
import { fetchBrands } from '../services/api';
import type { Brand } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

const WALL_COLUMNS = 3;

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

  // Exact square tiles: the wall's cell width is the content area minus the
  // inter-tile gaps, divided across the columns (measured, not percentage).
  const { width } = useWindowDimensions();
  const cellWidth =
    (width - Spacing.contentHorizontal * 2 - Spacing.sm * (WALL_COLUMNS - 1)) / WALL_COLUMNS;

  const sections = groupByCategory(brands ?? []).map(([category, categoryBrands]) => ({
    key: category,
    title: category,
    count: categoryBrands.length,
    children: (
      <View style={styles.wall}>
        {categoryBrands.map((brand) => (
          <BrandLogoCard
            key={brand.id}
            brand={brand}
            width={cellWidth}
            onPress={() => navigation.navigate('InAppBrowser', { brand })}
          />
        ))}
      </View>
    ),
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

const styles = StyleSheet.create({
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
