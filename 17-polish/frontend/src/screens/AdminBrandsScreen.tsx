import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import AdminCatalogScreen from '../components/layouts/AdminCatalogScreen';
import BrandLogoCard from '../components/BrandLogoCard';
import { fetchBrands } from '../services/api';
import type { Brand } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

const WALL_COLUMNS = 3;

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

  // Exact square tiles: the content area minus the inter-tile gaps, divided
  // across the columns (measured, not percentage) — the same rule BrandsScreen
  // computes its wall with.
  const { width } = useWindowDimensions();
  const cellWidth =
    (width - Spacing.contentHorizontal * 2 - Spacing.sm * (WALL_COLUMNS - 1)) / WALL_COLUMNS;

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
      <View style={styles.wall}>
        {brands?.map((brand: Brand) => (
          <BrandLogoCard
            key={brand.id}
            brand={brand}
            width={cellWidth}
            onPress={() => navigation.navigate('AdminBrandForm', { brand })}
          />
        ))}
      </View>
    </AdminCatalogScreen>
  );
}

const styles = StyleSheet.create({
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
