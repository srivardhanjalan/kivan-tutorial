import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import ModalCard from './ModalCard';
import SelectableRow from './SelectableRow';
import SelectableList from './SelectableList';
import ConfirmCancelButtons from './ConfirmCancelButtons';
import { useToast } from './ToastProvider';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useAsyncAction from '../hooks/useAsyncAction';
import { createWish, fetchMyWishlists } from '../services/api';
import type { Wishlist } from '../services/api';
import type { CurrencyCode } from '../constants/Currency';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/** The lightweight wish draft this modal turns into a wish. Both add-paths
    build one: the catalog product detail (from a Product) and the in-app
    browser (from a scrape). Only `name` is required; the rest ride along when
    the source has them. `storefront_id` (catalog) and `brand_id` (browser) are
    the wish's origin, stamped so the tiles can badge it with that source's logo;
    a draft carries at most one. */
export interface WishDraft {
  name: string;
  cost?: number | null;
  cost_currency?: CurrencyCode | null;
  link_url?: string | null;
  description?: string | null;
  image_url?: string | null;
  storefront_id?: string | null;
  brand_id?: string | null;
}

interface AddToWishlistModalProps {
  visible: boolean;
  draft: WishDraft;
  onClose: () => void;
  /** Fired after the draft lands as a wish, so the catalog product detail can
      flip to its "already saved" state without a refetch. The browser scrape
      path has nothing to flip, so it omits this. */
  onAdded?: () => void;
}

/**
 * The one bridge into collections: pick a wishlist and the draft lands there
 * as a wish (the same POST /wishes the manual form uses). Both add-paths raise
 * this modal (the catalog product detail and the in-app browser scrape), so
 * the wishlist picker and the quick-create-first fallback live here once.
 * Loads your wishlists each time it opens and preselects the first; with none
 * yet, it routes you to create one instead of dead-ending.
 */
export default function AddToWishlistModal({ visible, draft, onClose, onAdded }: AddToWishlistModalProps) {
  const navigation = useAppNavigation();
  const toast = useToast();
  const { loading: adding, run } = useAsyncAction();
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reload on each open so a wishlist created since last time shows; preselect
  // the first so the confirm always has a target (no silent no-op).
  useEffect(() => {
    if (!visible) return;
    setWishlists(null);
    setSelectedId(null);
    let live = true;
    fetchMyWishlists()
      .then((data) => {
        if (!live) return;
        setWishlists(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => {
        if (!live) return;
        toast.show('Could not load your wishlists', { type: 'error' });
        onClose();
      });
    return () => {
      live = false;
    };
  }, [visible]);

  const add = () => {
    if (!selectedId) return;
    run(async () => {
      // Only send the fields the draft actually carries; a scrape may miss the
      // price or image, and createWish leaves an omitted field unset.
      await createWish({
        wishlist_id: selectedId,
        name: draft.name,
        ...(draft.description ? { description: draft.description } : {}),
        ...(draft.cost != null ? { cost: draft.cost } : {}),
        ...(draft.cost_currency ? { cost_currency: draft.cost_currency } : {}),
        ...(draft.link_url ? { link_url: draft.link_url } : {}),
        ...(draft.image_url ? { image_url: draft.image_url } : {}),
        // Stamp where the wish came from so the tiles can badge it with that
        // source's logo: a storefront_id from the catalog, a brand_id from the
        // in-app browser (a draft carries at most one).
        ...(draft.storefront_id ? { storefront_id: draft.storefront_id } : {}),
        ...(draft.brand_id ? { brand_id: draft.brand_id } : {}),
      });
      const savedTo = wishlists?.find((w) => w.id === selectedId)?.name;
      toast.show(savedTo ? `Added to ${savedTo}` : 'Added to your wishlist');
      onAdded?.();
      onClose();
    }, 'Could not add this to your wishlist');
  };

  const createFirst = () => {
    onClose();
    navigation.navigate('WishlistForm', {});
  };

  return (
    <ModalCard
      visible={visible}
      title="Add to a wishlist"
      message={`Pick a wishlist for "${draft.name}".`}
    >
      {wishlists === null ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : wishlists.length === 0 ? (
        <>
          <Text style={styles.empty}>
            You have no wishlists yet. Create one, then add this to it.
          </Text>
          <ConfirmCancelButtons
            confirmTitle="Create a wishlist"
            onConfirm={createFirst}
            loading={false}
            onCancel={onClose}
          />
        </>
      ) : (
        <>
          <SelectableList>
            {wishlists.map((w) => (
              <SelectableRow
                key={w.id}
                label={w.name}
                selected={w.id === selectedId}
                onPress={() => setSelectedId(w.id)}
              />
            ))}
          </SelectableList>
          <ConfirmCancelButtons
            confirmTitle="Add to wishlist"
            onConfirm={add}
            loading={adding}
            onCancel={onClose}
          />
        </>
      )}
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignSelf: 'center',
    marginVertical: Spacing.lg,
  },
  empty: {
    ...Typography.bodySecondary,
    marginBottom: Spacing.lg,
  },
});
