import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EditDeleteHeaderButtons from '../components/EditDeleteHeaderButtons';
import DetailAction from '../components/DetailAction';
import DetailStatusRow from '../components/DetailStatusRow';
import ConfirmModal from '../components/ConfirmModal';
import PhotoDetailHero from '../components/PhotoDetailHero';
import DetailTitleBlock from '../components/DetailTitleBlock';
import useFetch from '../hooks/useFetch';
import useAsyncAction from '../hooks/useAsyncAction';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import useOpenExternalLink from '../hooks/useOpenExternalLink';
import useStorefronts from '../hooks/useStorefronts';
import { fetchWish, completeWish, uncompleteWish, deleteWish } from '../services/api';
import type { Wish } from '../services/api';
import BorderRadius from '../constants/BorderRadius';
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
  const openExternalLink = useOpenExternalLink();

  // Refetch on focus so an edit shows on return; the local copy below gives
  // the complete/uncomplete toggle instant feedback, and a focus refetch then
  // reconciles it with the server's persisted state.
  const { data } = useFetch(() => fetchWish(wishId), { refetchOnFocus: true });
  const { storefrontFor } = useStorefronts();
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

  // The store a catalog wish came from, resolved for its logo and name; a
  // hand-typed wish has no storefront_id, so this stays undefined and no row shows.
  const store = wish ? storefrontFor(wish.storefront_id) : undefined;

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
            <DetailStatusRow label="Fulfilled" />
          )}

          {store && (
            <View style={styles.storeRow}>
              {store.logo_url && (
                <Image source={{ uri: store.logo_url }} style={styles.storeLogo} resizeMode="cover" />
              )}
              <Text style={styles.storeName}>From {store.name}</Text>
            </View>
          )}

          <DetailTitleBlock title={wish.name} cost={wish.cost} currency={wish.cost_currency} description={wish.description} />

          {wish.link_url ? (
            <DetailAction title="Open Link" variant="secondary" onPress={openLink} />
          ) : null}

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
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  storeLogo: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
  },
  storeName: {
    ...Typography.bodySecondaryStrong,
  },
});
