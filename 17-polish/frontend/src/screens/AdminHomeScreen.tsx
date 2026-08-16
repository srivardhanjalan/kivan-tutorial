import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import CatalogRow from '../components/CatalogRow';
import { Spacing } from '../constants/ScreenStyles';

/**
 * The admin dashboard's home: one row per domain the operator manages. Reached
 * only from the role-gated Settings entry, so the screen itself carries no
 * further gate (the backend gates every write regardless). Each row leads to
 * that domain's list; the whole surface is the tutorial's plain row idiom, with
 * image-forward layouts deferred to step 17.
 */
export default function AdminHomeScreen() {
  const navigation = useAppNavigation();

  return (
    <FloatingHeaderLayout title="Admin" showBack>
      <View style={styles.list}>
        <CatalogRow
          icon="people-outline"
          title="Users"
          accessibilityLabel="Users"
          description="The roster, and who is an admin."
          showChevron
          onPress={() => navigation.navigate('AdminUsers')}
        />
        <CatalogRow
          icon="pricetags-outline"
          title="Brands"
          accessibilityLabel="Brands"
          description="The real-store directory."
          showChevron
          onPress={() => navigation.navigate('AdminBrands')}
        />
        <CatalogRow
          icon="calendar-outline"
          title="Life events"
          accessibilityLabel="Life events"
          description="The occasions wishlists are tagged with."
          showChevron
          onPress={() => navigation.navigate('AdminLifeEvents')}
        />
        <CatalogRow
          icon="storefront-outline"
          title="Storefronts & products"
          accessibilityLabel="Storefronts and products"
          description="The curated catalog and its products."
          showChevron
          onPress={() => navigation.navigate('AdminStorefronts')}
        />
      </View>
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
