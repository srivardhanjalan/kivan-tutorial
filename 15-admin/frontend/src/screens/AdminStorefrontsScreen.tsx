import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useFetch from '../hooks/useFetch';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import CatalogRow from '../components/CatalogRow';
import EmptyStateView from '../components/EmptyStateView';
import HeaderIconButton from '../components/HeaderIconButton';
import { fetchStorefronts } from '../services/api';
import type { Storefront } from '../services/api';
import { pluralize } from '../utils/pluralize';
import { Spacing } from '../constants/ScreenStyles';

/**
 * The curated store catalog, admin side: each row opens the store's edit form,
 * the header + adds one. Refetches on focus so a change from the form (and the
 * product_count the product routes keep) shows on return. A store's logo is
 * seed-owned, so a row created here shows the glyph until a later step ships an
 * uploader.
 */
export default function AdminStorefrontsScreen() {
  const navigation = useAppNavigation();
  const { data: storefronts, loading } = useFetch(fetchStorefronts, { refetchOnFocus: true });

  return (
    <FloatingHeaderLayout
      title="Storefronts"
      showBack
      loading={loading}
      headerRight={
        <HeaderIconButton
          icon="add"
          accessibilityLabel="New storefront"
          onPress={() => navigation.navigate('AdminStorefrontForm', {})}
        />
      }
    >
      {storefronts && storefronts.length === 0 ? (
        <EmptyStateView
          icon="storefront-outline"
          title="No storefronts yet"
          subtitle="Add a store, or seed the catalog (see the step README)."
          actionLabel="New storefront"
          onAction={() => navigation.navigate('AdminStorefrontForm', {})}
        />
      ) : (
        <View style={styles.list}>
          {storefronts?.map((storefront: Storefront) => (
            <CatalogRow
              key={storefront.id}
              icon="storefront-outline"
              logoUrl={storefront.logo_url}
              title={storefront.name}
              accessibilityLabel={storefront.name}
              description={storefront.description}
              meta={[
                { icon: 'pricetag-outline', text: pluralize(storefront.product_count, 'product') },
              ]}
              showChevron
              onPress={() => navigation.navigate('AdminStorefrontForm', { storefront })}
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
