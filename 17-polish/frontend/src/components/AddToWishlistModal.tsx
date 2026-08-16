import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import ModalCard from './ModalCard';
import FormInput from './FormInput';
import SelectableRow from './SelectableRow';
import SelectableList from './SelectableList';
import ConfirmCancelButtons from './ConfirmCancelButtons';
import { useToast } from './ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';
import { createWish, createWishlist, fetchMyWishlists } from '../services/api';
import type { Wishlist } from '../services/api';
import type { CurrencyCode } from '../constants/Currency';
import { getLastUsedWishlistId, setLastUsedWishlistId } from '../utils/lastUsedWishlist';
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
 * The one bridge into collections: name the wish, pick a wishlist, and the draft
 * lands there (the same POST /wishes the manual form uses). Both add-paths raise
 * this modal (the catalog product detail and the in-app browser scrape), so the
 * name field, the wishlist picker, and the quick-create-first path live here
 * once. Loads your wishlists each time it opens and preselects the one you last
 * added to (falling back to the first), so the common case is a single confirm.
 * With no wishlists yet, it creates one inline and continues the add rather than
 * dead-ending you out to the form.
 */
export default function AddToWishlistModal({ visible, draft, onClose, onAdded }: AddToWishlistModalProps) {
  const toast = useToast();
  const { loading: adding, run } = useAsyncAction();
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The wish's name, seeded from the draft but editable before it's saved.
  const [name, setName] = useState(draft.name);
  // The name for the inline first-wishlist create (zero-wishlist path).
  const [newListName, setNewListName] = useState('');

  // Reload on each open so a wishlist created since last time shows; reseed the
  // editable name; preselect the last-used wishlist (else the first) so the
  // confirm always has a target.
  useEffect(() => {
    if (!visible) return;
    setWishlists(null);
    setSelectedId(null);
    setName(draft.name);
    setNewListName('');
    let live = true;
    (async () => {
      try {
        const data = await fetchMyWishlists();
        if (!live) return;
        setWishlists(data);
        if (data.length > 0) {
          const lastUsed = await getLastUsedWishlistId();
          if (!live) return;
          const preferred =
            lastUsed && data.some((w) => w.id === lastUsed) ? lastUsed : data[0].id;
          setSelectedId(preferred);
        }
      } catch {
        if (!live) return;
        toast.show('Could not load your wishlists', { type: 'error' });
        onClose();
      }
    })();
    return () => {
      live = false;
    };
  }, [visible]);

  const add = () => {
    if (!selectedId) return;
    if (!name.trim()) {
      toast.show('Give this wish a name', { type: 'error' });
      return;
    }
    run(async () => {
      // Only send the fields the draft actually carries; a scrape may miss the
      // price or image, and createWish leaves an omitted field unset.
      await createWish({
        wishlist_id: selectedId,
        name: name.trim(),
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
      // Remember this list so the next add preselects it.
      await setLastUsedWishlistId(selectedId);
      const savedTo = wishlists?.find((w) => w.id === selectedId)?.name;
      toast.show(savedTo ? `Added to ${savedTo}` : 'Added to your wishlist');
      onAdded?.();
      onClose();
    }, 'Could not add this to your wishlist');
  };

  // Zero-wishlist path: create the first wishlist inline and keep the modal open
  // with it selected, so the add continues instead of navigating away.
  const createFirst = () => {
    if (!newListName.trim()) {
      toast.show('Give your wishlist a name', { type: 'error' });
      return;
    }
    run(async () => {
      const created = await createWishlist({ name: newListName.trim(), privacy_type: 'public' });
      setWishlists([created]);
      setSelectedId(created.id);
      setNewListName('');
    }, 'Could not create your wishlist');
  };

  return (
    <ModalCard visible={visible} title="Add to a wishlist" message="Name it, then pick a wishlist.">
      {wishlists === null ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : (
        <>
          <FormInput
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            maxLength={200}
          />

          {wishlists.length === 0 ? (
            <>
              <Text style={styles.empty}>
                You have no wishlists yet. Create one to add this to.
              </Text>
              <FormInput
                value={newListName}
                onChangeText={setNewListName}
                placeholder="New wishlist name"
                maxLength={200}
              />
              <ConfirmCancelButtons
                confirmTitle="Create wishlist"
                onConfirm={createFirst}
                loading={adding}
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
