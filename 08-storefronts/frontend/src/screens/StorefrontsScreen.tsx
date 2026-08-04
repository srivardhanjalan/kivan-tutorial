import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import useFetch from '../hooks/useFetch';
import { fetchStorefronts } from '../services/api';
import type { Storefront } from '../services/api';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/** One curated store as a row: its logo (a storefront glyph when it has none),
    the name, its blurb, and how many products it holds. Tapping opens the
    store's products. */
function StorefrontRow({ storefront, onPress }: { storefront: Storefront; onPress: () => void }) {
  const { name, description, logo_url, product_count } = storefront;
  return (
    <TouchableOpacity
      style={[CommonScreenStyles.outlinedSurface, styles.row]}
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <View style={[CommonScreenStyles.center, styles.logo]}>
        {logo_url ? (
          <Image source={{ uri: logo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name="storefront-outline" size={Spacing.tileGlyphSize} color={Colors.primary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {description ? (
          <Text style={styles.meta} numberOfLines={2}>{description}</Text>
        ) : null}
        <View style={styles.countRow}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.meta}>
            {product_count} {product_count === 1 ? 'product' : 'products'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * The Wish Store tab: the curated catalog of stores. Each store opens to its
 * products, and a product adds itself to one of your wishlists: the catalog
 * path to a wish, alongside the manual form. The stores are seeded reference
 * data, so this loads once on mount (nothing changes them at runtime).
 */
export default function StorefrontsScreen() {
  const navigation = useAppNavigation();
  const { data: storefronts, loading } = useFetch(fetchStorefronts);

  return (
    <FloatingHeaderLayout title="Wish Store" loading={loading}>
      <SectionHeader title="Stores" meta={storefronts?.length ?? 0} />
      {storefronts && storefronts.length === 0 ? (
        <EmptyStateView
          icon="storefront-outline"
          title="No stores yet"
          subtitle="The curated catalog is empty. Seed it (see the step README) to browse stores here."
        />
      ) : (
        <View style={styles.list}>
          {storefronts?.map((storefront) => (
            <StorefrontRow
              key={storefront.id}
              storefront={storefront}
              onPress={() => navigation.navigate('StorefrontDetail', { storefront })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.subtleFill,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.cardTitle,
  },
  // The store's blurb and its product count share one muted look
  meta: {
    ...Typography.bodySecondary,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
