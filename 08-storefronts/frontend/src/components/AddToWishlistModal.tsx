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
import type { Product, Wishlist } from '../services/api';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface AddToWishlistModalProps {
  visible: boolean;
  product: Product;
  onClose: () => void;
  /** Fired after the product lands as a wish, so the detail screen can flip to
      its "already saved" state without a refetch. */
  onAdded: () => void;
}

/**
 * The bridge from the catalog into collections: pick one of your wishlists and
 * the product lands there as a wish (name, price → cost, link carried straight
 * over: the same POST /wishes the manual form uses). Loads your wishlists each
 * time it opens and preselects the first; with none yet, it routes you to
 * create one instead of dead-ending.
 */
export default function AddToWishlistModal({ visible, product, onClose, onAdded }: AddToWishlistModalProps) {
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
      await createWish({
        wishlist_id: selectedId,
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        cost: product.price,
        link_url: product.link_url,
        // Carry the product's photo onto the wish, and stamp which store it came
        // from so the wish tiles can badge it with that store's logo
        ...(product.image_url ? { image_url: product.image_url } : {}),
        storefront_id: product.storefront_id,
      });
      const savedTo = wishlists?.find((w) => w.id === selectedId)?.name;
      toast.show(savedTo ? `Added to ${savedTo}` : 'Added to your wishlist');
      onAdded();
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
      message={`Pick a wishlist for "${product.name}".`}
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
