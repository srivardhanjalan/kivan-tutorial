import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import DetailHeaderActions from '../components/DetailHeaderActions';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import MasonryGrid from '../components/MasonryGrid';
import WishCard from '../components/WishCard';
import AddTileCard from '../components/AddTileCard';
import LifeEventDetailHero from '../components/LifeEventDetailHero';
import ConfirmModal from '../components/ConfirmModal';
import LoveButton from '../components/LoveButton';
import WishlistPlaceholderGlyph from '../components/WishlistPlaceholderGlyph';
import WishlistOwnerList from '../components/WishlistOwnerList';
import ManageOwnersModal from '../components/ManageOwnersModal';
import ShareWishlistModal from '../components/ShareWishlistModal';
import DetailAction from '../components/DetailAction';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import useWishOrigin from '../hooks/useWishOrigin';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import useAsyncAction from '../hooks/useAsyncAction';
import {
  fetchWishlist,
  fetchWishes,
  deleteWishlist,
  fetchLoveStatus,
  fetchWishlistOwners,
  removeWishlistOwner,
} from '../services/api';
import type { User } from '../services/api';
import { userDisplayName } from '../utils/userName';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One wishlist: a pastel/image hero carrying its life event, then its wishes.
 * On YOUR wishlist, edit and delete live in the header and an add tile leads
 * the grid. On someone ELSE'S (reached from their profile), a love heart takes
 * the header's place and the wishes are display-only. Everything refetches on
 * focus so a change shows on return.
 */
export default function WishlistDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'WishlistDetail'>();
  const { wishlistId } = route.params;
  const { user } = useUser();

  const { data: wishlist, loading } = useFetch(() => fetchWishlist(wishlistId), {
    refetchOnFocus: true,
  });
  const { data: wishes } = useFetch(() => fetchWishes(wishlistId), { refetchOnFocus: true });
  const { data: loved } = useFetch(() => fetchLoveStatus(wishlistId), { refetchOnFocus: true });
  const { data: owners, refetch: refetchOwners } = useFetch(
    () => fetchWishlistOwners(wishlistId),
    { refetchOnFocus: true }
  );
  const { lifeEventFor } = useLifeEvents();
  const { originFor } = useWishOrigin();
  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteWishlist(wishlistId),
    'Could not delete this wishlist'
  );
  const { loading: removingOwner, run: runOwner } = useAsyncAction();

  const [showShare, setShowShare] = useState(false);
  const [showManageOwners, setShowManageOwners] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  const lifeEvent = wishlist ? lifeEventFor(wishlist.life_event_id) : undefined;
  // Ownership is the owners join table, not just the creator: a co-owner is a
  // full owner (edit, delete, manage owners), so the header actions and the
  // co-owner panel key off membership in the owners list. Null while it loads,
  // so a co-owner briefly reads as a viewer until it arrives.
  const isOwner = !!owners && !!user && owners.some((o) => o.id === user.id);
  const addWish = () => navigation.navigate('WishForm', { wishlistId });

  // Wider screens fit more masonry columns; the grid picks the count off the
  // window width, so a tablet shows more wishes per row than a phone.
  const { width } = useWindowDimensions();
  const wishColumns = width >= 768 ? 4 : width >= 600 ? 3 : 2;

  const confirmRemoveOwner = () => {
    if (!removeTarget) return;
    runOwner(async () => {
      await removeWishlistOwner(wishlistId, removeTarget.id);
      setRemoveTarget(null);
      refetchOwners();
    }, 'Could not remove that co-owner');
  };

  return (
    <FloatingHeaderLayout
      title={wishlist?.name ?? ''}
      loading={loading}
      showBack
      headerRight={
        wishlist ? (
          <DetailHeaderActions
            shareLabel="Share wishlist"
            onShare={() => setShowShare(true)}
            manage={
              isOwner
                ? {
                    subject: 'wishlist',
                    onEdit: () => navigation.navigate('WishlistForm', { wishlist }),
                    onDelete: requestDelete,
                  }
                : undefined
            }
          />
        ) : undefined
      }
    >
      {wishlist && (
        <>
          <LifeEventDetailHero
            lifeEvent={lifeEvent}
            imageUrl={wishlist.image_url}
            placeholder={
              <WishlistPlaceholderGlyph lifeEvent={lifeEvent} size={Spacing.detailHeroGlyphSize} />
            }
          />

          {/* Someone else's wishlist: love it. Mounts once love status loads. */}
          {!isOwner && loved !== null && (
            <View style={styles.loveRow}>
              <LoveButton
                wishlistId={wishlistId}
                initialLoved={loved}
                initialCount={wishlist.love_count}
              />
            </View>
          )}

          {/* Co-owners: owner-only. A co-owner is a full owner, added directly
              (no invite step) and removable unless they're the last one. */}
          {isOwner && owners && (
            <>
              <SectionHeader title="Co-owners" meta={owners.length} />
              <WishlistOwnerList
                owners={owners}
                onRemove={owners.length > 1 ? setRemoveTarget : undefined}
              />
              <DetailAction
                title="Add co-owner"
                variant="secondary"
                onPress={() => setShowManageOwners(true)}
              />
            </>
          )}

          <SectionHeader title="Wishes" meta={wishes?.length ?? 0} />
          {wishes && wishes.length === 0 ? (
            <EmptyStateView
              icon="sparkles-outline"
              title="No wishes yet"
              subtitle={
                isOwner
                  ? "Add the things you're hoping for to this wishlist."
                  : "This wishlist doesn't have any wishes yet."
              }
              actionLabel={isOwner ? 'Add a wish' : undefined}
              onAction={isOwner ? addWish : undefined}
            />
          ) : (
            <MasonryGrid
              data={[
                ...(isOwner ? [{ kind: 'add' as const }] : []),
                ...(wishes ?? []).map((wish) => ({ kind: 'wish' as const, wish })),
              ]}
              numColumns={wishColumns}
              keyExtractor={(item) => (item.kind === 'add' ? 'add' : item.wish.id)}
              renderItem={(item) =>
                item.kind === 'add' ? (
                  <AddTileCard label="New Wish" onPress={addWish} />
                ) : (
                  <WishCard
                    wish={item.wish}
                    originLogo={originFor(item.wish)?.logoUrl}
                    onPress={
                      isOwner
                        ? () => navigation.navigate('WishDetail', { wishId: item.wish.id })
                        : undefined
                    }
                  />
                )
              }
            />
          )}
        </>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete wishlist?"
        message="This removes the wishlist and every wish in it. This cannot be undone."
        confirmTitle="Delete Wishlist"
      />

      <ConfirmModal
        visible={removeTarget !== null}
        title="Remove co-owner?"
        message={
          removeTarget
            ? `Remove ${userDisplayName(removeTarget)} as a co-owner? They'll lose access to this wishlist.`
            : ''
        }
        confirmTitle="Remove"
        loading={removingOwner}
        onConfirm={confirmRemoveOwner}
        onCancel={() => setRemoveTarget(null)}
      />

      <ManageOwnersModal
        visible={showManageOwners}
        wishlistId={wishlistId}
        owners={owners ?? []}
        onClose={() => setShowManageOwners(false)}
        onAdded={refetchOwners}
      />

      {wishlist && (
        <ShareWishlistModal
          visible={showShare}
          wishlistId={wishlistId}
          wishlistName={wishlist.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  loveRow: {
    marginTop: Spacing.lg,
  },
});
