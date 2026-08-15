import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import CatalogRow from '../components/CatalogRow';
import EmptyStateView from '../components/EmptyStateView';
import HeaderIconButton from '../components/HeaderIconButton';
import { fetchBrands } from '../services/api';
import type { Brand } from '../services/api';
import { Spacing } from '../constants/ScreenStyles';

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
    <FloatingHeaderLayout
      title="Brands"
      showBack
      loading={loading}
      headerRight={
        <HeaderIconButton
          icon="add"
          accessibilityLabel="New brand"
          onPress={() => navigation.navigate('AdminBrandForm', {})}
        />
      }
    >
      {brands && brands.length === 0 ? (
        <EmptyStateView
          icon="pricetags-outline"
          title="No brands yet"
          subtitle="Add a brand, or seed the directory (see the step README)."
          actionLabel="New brand"
          onAction={() => navigation.navigate('AdminBrandForm', {})}
        />
      ) : (
        <View style={styles.list}>
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
