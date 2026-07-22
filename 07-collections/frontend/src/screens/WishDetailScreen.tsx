import React, { useEffect, useState } from 'react';
import { View, Text, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EditDeleteHeaderButtons from '../components/EditDeleteHeaderButtons';
import PrimaryButton from '../components/PrimaryButton';
import ConfirmModal from '../components/ConfirmModal';
import ArtTile from '../components/ArtTile';
import ImagePlaceholderGlyph from '../components/ImagePlaceholderGlyph';
import { useToast } from '../components/ToastProvider';
import useFetch from '../hooks/useFetch';
import useAsyncAction from '../hooks/useAsyncAction';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import { fetchWish, completeWish, uncompleteWish, deleteWish } from '../services/api';
import type { Wish } from '../services/api';
import { formatCost } from '../utils/formatCost';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

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
  const toast = useToast();

  // Refetch on focus so an edit shows on return; the local copy below gives
  // the complete/uncomplete toggle instant feedback, and a focus refetch then
  // reconciles it with the server's persisted state.
  const { data } = useFetch(() => fetchWish(wishId), { refetchOnFocus: true });
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
    if (wish?.link_url) {
      Linking.openURL(wish.link_url).catch(() =>
        toast.show('Could not open the link', { type: 'error' })
      );
    }
  };

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
          <ArtTile
            height={Spacing.detailHeroHeight}
            color={Colors.subtleFill}
            imageUrl={wish.image_url}
            placeholder={<ImagePlaceholderGlyph size={Spacing.detailHeroGlyphSize} />}
          />

          {wish.completed && (
            <View style={styles.fulfilledRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.fulfilledText}>Fulfilled</Text>
            </View>
          )}

          <Text style={styles.name}>{wish.name}</Text>
          {wish.cost !== null && <Text style={styles.cost}>{formatCost(wish.cost)}</Text>}
          {wish.description ? <Text style={styles.description}>{wish.description}</Text> : null}

          {wish.link_url ? (
            <View style={styles.action}>
              <PrimaryButton title="Open Link" variant="secondary" onPress={openLink} />
            </View>
          ) : null}

          <View style={styles.action}>
            <PrimaryButton
              title={wish.completed ? 'Mark as not fulfilled' : 'Mark as fulfilled'}
              variant={wish.completed ? 'secondary' : 'primary'}
              onPress={toggleComplete}
              loading={toggling}
            />
          </View>
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
  fulfilledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  fulfilledText: {
    ...Typography.bodySecondaryStrong,
    color: Colors.success,
  },
  name: {
    ...Typography.sectionTitle,
    marginTop: Spacing.lg,
  },
  cost: {
    ...Typography.sectionTitle,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  action: {
    marginTop: Spacing.lg,
  },
});
