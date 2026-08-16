import React from 'react';
import MasonryGrid from './MasonryGrid';
import WishCard from './WishCard';
import useMasonryColumns from '../hooks/useMasonryColumns';
import useWishOrigin from '../hooks/useWishOrigin';
import type { Wish } from '../services/api';

interface WishMasonryProps {
  wishes: Wish[];
  /** When given, each tile opens the wish (the owner's own feed); omit for a
      read-only feed — another user's profile has no wish detail to open into. */
  onPressWish?: (wishId: string) => void;
}

/**
 * The image-forward wishes feed shared by Home and a public profile: a masonry
 * of wish cards, each badged with the origin store's logo. The column count
 * follows the device width so the same grid widens on a larger screen. Home
 * makes each tile open the wish; a profile's feed is display-only.
 */
export default function WishMasonry({ wishes, onPressWish }: WishMasonryProps) {
  const numColumns = useMasonryColumns();
  const { originFor } = useWishOrigin();

  return (
    <MasonryGrid
      data={wishes}
      numColumns={numColumns}
      keyExtractor={(wish) => wish.id}
      renderItem={(wish) => (
        <WishCard
          wish={wish}
          originLogo={originFor(wish)?.logoUrl}
          onPress={onPressWish ? () => onPressWish(wish.id) : undefined}
        />
      )}
    />
  );
}
