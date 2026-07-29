import React from 'react';
import { Text, StyleSheet } from 'react-native';
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
import WishlistPlaceholderGlyph from '../components/WishlistPlaceholderGlyph';
import useFetch from '../hooks/useFetch';
import useLifeEvents from '../hooks/useLifeEvents';
import useConfirmedDelete from '../hooks/useConfirmedDelete';
import { fetchWishlist, fetchWishes, deleteWishlist } from '../services/api';
import pastelForLifeEvent from '../constants/lifeEventPastels';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One wishlist: a pastel/image hero carrying its life event, then the grid of
 * its wishes with an add tile. Edit and delete live in the header; the wishes
 * refetch on focus so adds and edits show on return.
 */
export default function WishlistDetailScreen() {
  const navigation = useAppNavigation();
  const route = useAppRoute<'WishlistDetail'>();
  const { wishlistId } = route.params;

  const { data: wishlist, loading } = useFetch(() => fetchWishlist(wishlistId), {
    refetchOnFocus: true,
  });
  const { data: wishes } = useFetch(() => fetchWishes(wishlistId), { refetchOnFocus: true });
  const { lifeEventFor } = useLifeEvents();
  const { requestDelete, confirmProps } = useConfirmedDelete(
    () => deleteWishlist(wishlistId),
    'Could not delete this wishlist'
  );

  const lifeEvent = wishlist ? lifeEventFor(wishlist.life_event_id) : undefined;

  return (
    <FloatingHeaderLayout
      title={wishlist?.name ?? ''}
      loading={loading}
      showBack
      headerRight={
        wishlist ? (
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

          <SectionHeader title="Wishes" meta={wishes?.length ?? 0} />
          {wishes && wishes.length === 0 ? (
            <EmptyStateView
              icon="sparkles-outline"
              title="No wishes yet"
              subtitle="Add the things you're hoping for to this wishlist."
              actionLabel="Add a wish"
              onAction={() => navigation.navigate('WishForm', { wishlistId })}
            />
          ) : (
            <TileGrid>
              <AddTileCard
                label="New Wish"
                onPress={() => navigation.navigate('WishForm', { wishlistId })}
              />
              {wishes?.map((wish) => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  onPress={() => navigation.navigate('WishDetail', { wishId: wish.id })}
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
});
