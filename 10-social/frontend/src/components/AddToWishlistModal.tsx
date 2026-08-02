import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ModalCard from './ModalCard';
import ConfirmCancelButtons from './ConfirmCancelButtons';
import { useToast } from './ToastProvider';
import { useAppNavigation } from '../hooks/useAppNavigation';
import useAsyncAction from '../hooks/useAsyncAction';
import { createWish, fetchMyWishlists } from '../services/api';
import type { Product, Wishlist } from '../services/api';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface AddToWishlistModalProps {
  visible: boolean;
  product: Product;
  onClose: () => void;
}

/**
 * The bridge from the catalog into collections: pick one of your wishlists and
 * the product lands there as a wish (name, price → cost, link carried straight
 * over: the same POST /wishes the manual form uses). Loads your wishlists each
 * time it opens and preselects the first; with none yet, it routes you to
 * create one instead of dead-ending.
 */
export default function AddToWishlistModal({ visible, product, onClose }: AddToWishlistModalProps) {
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
      });
      const savedTo = wishlists?.find((w) => w.id === selectedId)?.name;
      toast.show(savedTo ? `Added to ${savedTo}` : 'Added to your wishlist');
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
          <View style={styles.list}>
            {wishlists.map((w) => {
              const selected = w.id === selectedId;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setSelectedId(w.id)}
                  activeOpacity={Opacity.pressed}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={w.name}
                  style={[CommonScreenStyles.outlinedSurface, styles.row, selected && styles.rowSelected]}
                >
                  <Text
                    style={[styles.rowLabel, selected && styles.rowLabelSelected]}
                    numberOfLines={1}
                  >
                    {w.name}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
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
  list: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  // Layered over CommonScreenStyles.outlinedSurface (the shared raised-card
  // look StorefrontRow also composes): this adds only the row layout and a
  // tighter vertical pad than the surface's all-round lg
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowSelected: {
    borderColor: Colors.primary,
  },
  rowLabel: {
    ...Typography.bodySecondaryStrong,
    flex: 1,
  },
  rowLabelSelected: {
    color: Colors.primary,
  },
});
