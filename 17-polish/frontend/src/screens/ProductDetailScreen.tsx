import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import PhotoDetailHero from '../components/PhotoDetailHero';
import DetailTitleBlock from '../components/DetailTitleBlock';
import GlassPill from '../components/GlassPill';
import AddToWishlistModal from '../components/AddToWishlistModal';
import useFetch from '../hooks/useFetch';
import useOpenExternalLink from '../hooks/useOpenExternalLink';
import { fetchMyWishes } from '../services/api';
import { formatCost } from '../utils/formatCost';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/**
 * One catalog product: its photo as the hero (a placeholder glyph stands in
 * when it has none), the name and blurb, then a glass price pill beside a
 * View Product jump to the store. The Add to Wishlist call to action is a
 * floating pill pinned above the safe-area inset, not a button in the flow.
 * The product arrives through navigation (the catalog is curated, nothing to
 * refetch), but the add flow guards against duplicates: it reads every wish
 * across your wishlists once and, if this product's link is already saved,
 * the floating pill shows "Already in Wishlist" instead of the add action
 * (matched on link_url, the field a catalog wish carries over).
 */
export default function ProductDetailScreen() {
  const route = useAppRoute<'ProductDetail'>();
  const { product } = route.params;
  const openExternalLink = useOpenExternalLink();
  const [picking, setPicking] = useState(false);

  // "Checking…" until the read resolves, then either the add action or the
  // already-saved pill. `added` flips it the instant a save succeeds, without
  // re-reading; an errored check falls through to the add action (loading=false).
  const { data: myWishes, loading: checking } = useFetch(fetchMyWishes);
  const [added, setAdded] = useState(false);
  const alreadySaved =
    added || (myWishes ?? []).some((wish) => wish.link_url === product.link_url);

  return (
    <FloatingHeaderLayout
      title={product.name}
      showBack
      floatingFooter={
        alreadySaved ? (
          <View style={[CommonScreenStyles.center, styles.ctaPill, styles.ctaDone]}>
            <Ionicons name="checkmark-circle" size={Spacing.chromeIconSize} color={Colors.white} />
            <Text style={styles.ctaText}>Already in Wishlist</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[CommonScreenStyles.center, styles.ctaPill, checking && CommonScreenStyles.dimmed]}
            onPress={() => setPicking(true)}
            disabled={checking}
            activeOpacity={Opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="Add to Wishlist"
          >
            <Ionicons name="heart-outline" size={Spacing.chromeIconSize} color={Colors.white} />
            <Text style={styles.ctaText}>{checking ? 'Checking…' : 'Add to Wishlist'}</Text>
          </TouchableOpacity>
        )
      }
    >
      <PhotoDetailHero imageUrl={product.image_url} />

      {/* Catalog products carry no currency, so the price omits it: the cost
          reads in the app default symbol. */}
      <DetailTitleBlock title={product.name} description={product.description} />

      {/* Price + store link on one row: the cost in a glass pill beside a
          View Product button (replacing the plain cost text and the stacked
          View product action). */}
      <View style={styles.priceLinkRow}>
        <GlassPill style={[CommonScreenStyles.center, styles.pricePill]}>
          <Text style={styles.priceText} numberOfLines={1}>{formatCost(product.price)}</Text>
        </GlassPill>
        <TouchableOpacity
          style={[CommonScreenStyles.center, styles.viewButton]}
          onPress={() => openExternalLink(product.link_url)}
          activeOpacity={Opacity.pressed}
          accessibilityRole="button"
          accessibilityLabel="View Product"
        >
          <Text style={styles.viewText} numberOfLines={1}>View Product</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* storefront_id and the product photo ride along, so the wish keeps its
          store badge and image. */}
      <AddToWishlistModal
        visible={picking}
        draft={{
          name: product.name,
          cost: product.price,
          link_url: product.link_url,
          description: product.description,
          image_url: product.image_url,
          storefront_id: product.storefront_id,
        }}
        onAdded={() => setAdded(true)}
        onClose={() => setPicking(false)}
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  priceLinkRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  pricePill: {
    flex: 0.75,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  priceText: {
    ...Typography.sectionTitle,
    color: Colors.primary,
  },
  viewButton: {
    flex: 1.25,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    ...Shadows.cta,
  },
  viewText: {
    ...Typography.button,
    flexShrink: 1,
  },
  ctaPill: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    ...Shadows.cta,
  },
  ctaDone: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  ctaText: {
    ...Typography.button,
  },
});
