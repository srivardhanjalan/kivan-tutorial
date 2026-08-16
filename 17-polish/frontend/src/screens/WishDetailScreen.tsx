import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EditDeleteHeaderButtons from '../components/EditDeleteHeaderButtons';
import DetailAction from '../components/DetailAction';
import ConfirmModal from '../components/ConfirmModal';
import PhotoDetailHero from '../components/PhotoDetailHero';
import DetailTitleBlock from '../components/DetailTitleBlock';
import GlassPill from '../components/GlassPill';
import useFetch from '../hooks/useFetch';
import useAsyncAction from '../hooks/useAsyncAction';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import useOpenExternalLink from '../hooks/useOpenExternalLink';
import useWishOrigin from '../hooks/useWishOrigin';
import { fetchWish, completeWish, uncompleteWish, deleteWish } from '../services/api';
import type { Wish } from '../services/api';
import { formatCost } from '../utils/formatCost';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/** The store's bare domain for the link button's label
    (https://www.example.com/p/42 → example.com). */
const storeDomain = (url: string): string =>
  url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

/**
 * One wish: its image (or a placeholder), name, cost and description, a jump
 * to the source link, and the got-it toggle. Complete/uncomplete swaps the
 * record in place — no refetch — so the fulfilled state flips instantly.
 * Edit and delete live in the header.
 */
export default function WishDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'WishDetail'>();
  const { wishId } = route.params;
  const openExternalLink = useOpenExternalLink();

  // Refetch on focus so an edit shows on return; the local copy below gives
  // the complete/uncomplete toggle instant feedback, and a focus refetch then
  // reconciles it with the server's persisted state.
  const { data } = useFetch(() => fetchWish(wishId), { refetchOnFocus: true });
  const { originFor } = useWishOrigin();
  const [wish, setWish] = useState<Wish | null>(null);
  useEffect(() => {
    if (data) setWish(data);
  }, [data]);

  const { loading: toggling, run: runToggle } = useAsyncAction();
  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteWish(wishId),
    'Could not delete this wish'
  );

  const toggleComplete = () =>
    runToggle(async () => {
      if (!wish) return;
      const updated = wish.completed ? await uncompleteWish(wish.id) : await completeWish(wish.id);
      setWish(updated);
    }, 'Could not update this wish');

  const openLink = () => {
    if (wish?.link_url) openExternalLink(wish.link_url);
  };

  // Where the wish came from, resolved for its logo and name: a catalog store
  // (storefront_id) or a browser-captured brand (brand_id). A hand-typed wish
  // carries neither, so this stays undefined and no row shows.
  const origin = wish ? originFor(wish) : undefined;

  return (
    <FloatingHeaderLayout
      title={wish?.name ?? ''}
      loading={!wish}
      showBack
      headerRight={
        wish ? (
          <EditDeleteHeaderButtons
            subject="wish"
            onEdit={() => navigation.navigate('WishForm', { wishlistId: wish.wishlist_id, wish })}
            onDelete={requestDelete}
          />
        ) : undefined
      }
    >
      {wish && (
        <>
          <PhotoDetailHero imageUrl={wish.image_url} />

          {wish.completed && (
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.statusLabel}>Fulfilled</Text>
            </View>
          )}

          {origin && (
            <View style={styles.originRow}>
              {origin.logoUrl && (
                <Image source={{ uri: origin.logoUrl }} style={styles.originLogo} resizeMode="cover" />
              )}
              <Text style={styles.originName}>From {origin.name}</Text>
            </View>
          )}

          <DetailTitleBlock title={wish.name} description={wish.description} />

          {/* Price + link on one row: the cost in a glass pill beside a link
              button labeled with the store's domain (replacing the plain cost
              text and the stacked Open Link button). */}
          {(wish.cost !== null || wish.link_url) && (
            <View style={styles.priceLinkRow}>
              {wish.cost !== null && (
                <GlassPill style={[CommonScreenStyles.center, styles.pricePill]}>
                  <Text style={styles.priceText}>{formatCost(wish.cost, wish.cost_currency)}</Text>
                </GlassPill>
              )}
              {wish.link_url && (
                <TouchableOpacity
                  style={[CommonScreenStyles.outlinedPill, styles.linkButton]}
                  onPress={openLink}
                  activeOpacity={Opacity.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${storeDomain(wish.link_url)}`}
                >
                  <Ionicons name="open-outline" size={Spacing.chromeIconSize} color={Colors.primary} />
                  <Text style={styles.linkText} numberOfLines={1}>{storeDomain(wish.link_url)}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <DetailAction
            title={wish.completed ? 'Mark as not fulfilled' : 'Mark as fulfilled'}
            variant={wish.completed ? 'secondary' : 'primary'}
            onPress={toggleComplete}
            loading={toggling}
          />
        </>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete wish?"
        message="This removes the wish from your wishlist. This cannot be undone."
        confirmTitle="Delete Wish"
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  // The fulfilled success line — a green check and a strong label above the
  // actions. Only this screen has a status line, so it lives here, not in a
  // shared component with a single caller.
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statusLabel: {
    ...Typography.bodySecondaryStrong,
    color: Colors.success,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  originLogo: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
  },
  originName: {
    ...Typography.bodySecondaryStrong,
  },
  priceLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  pricePill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  priceText: {
    ...Typography.bodySecondaryStrong,
  },
  linkButton: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  linkText: {
    ...Typography.bodySecondaryStrong,
    color: Colors.primary,
    flexShrink: 1,
  },
});
