import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useAppNavigation, useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import EditDeleteHeaderButtons from '../components/EditDeleteHeaderButtons';
import SectionHeader from '../components/SectionHeader';
import EmptyStateView from '../components/EmptyStateView';
import TileGrid from '../components/TileGrid';
import WishCard from '../components/WishCard';
import AddTileCard from '../components/AddTileCard';
import ArtTile from '../components/ArtTile';
import ConfirmModal from '../components/ConfirmModal';
import LoveButton from '../components/LoveButton';
import WishlistPlaceholderGlyph from '../components/WishlistPlaceholderGlyph';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import useWishOrigin from '../hooks/useWishOrigin';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import { fetchWishlist, fetchWishes, deleteWishlist, fetchLoveStatus } from '../services/api';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import Typography from '../constants/Typography';
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
  const { lifeEventFor } = useLifeEvents();
  const { originFor } = useWishOrigin();
  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteWishlist(wishlistId),
    'Could not delete this wishlist'
  );

  const lifeEvent = wishlist ? lifeEventFor(wishlist.life_event_id) : undefined;
  const isOwner = !!wishlist && wishlist.created_by === user?.id;
  const addWish = () => navigation.navigate('WishForm', { wishlistId });

  return (
    <FloatingHeaderLayout
      title={wishlist?.name ?? ''}
      loading={loading}
      showBack
      headerRight={
        wishlist && isOwner ? (
          <EditDeleteHeaderButtons
            subject="wishlist"
            onEdit={() => navigation.navigate('WishlistForm', { wishlist })}
            onDelete={requestDelete}
          />
        ) : undefined
      }
    >
      {wishlist && (
        <>
          <ArtTile
            height={Spacing.detailHeroHeight}
            color={pastelForLifeEvent(wishlist.life_event_id)}
            imageUrl={wishlist.image_url}
            placeholder={
              <WishlistPlaceholderGlyph lifeEvent={lifeEvent} size={Spacing.detailHeroGlyphSize} />
            }
          />
          {lifeEvent && <Text style={styles.eventName}>{lifeEvent.name}</Text>}

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
            <TileGrid>
              {isOwner && <AddTileCard label="New Wish" onPress={addWish} />}
              {wishes?.map((wish) => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  originLogo={originFor(wish)?.logoUrl}
                  onPress={
                    isOwner
                      ? () => navigation.navigate('WishDetail', { wishId: wish.id })
                      : undefined
                  }
                />
              ))}
            </TileGrid>
          )}
        </>
      )}

      <ConfirmModal
        {...confirmProps}
        title="Delete wishlist?"
        message="This removes the wishlist and every wish in it. This cannot be undone."
        confirmTitle="Delete Wishlist"
      />
    </FloatingHeaderLayout>
  );
}

const styles = StyleSheet.create({
  eventName: {
    ...Typography.bodySecondary,
    marginTop: Spacing.md,
  },
  loveRow: {
    marginTop: Spacing.lg,
  },
});
