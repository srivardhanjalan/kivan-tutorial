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
  /** An optional tile ahead of the wishes: a wishlist's "New Wish" add tile.
      Omitted on the Home and profile feeds. Mirrors WishlistGrid's leading. */
  leading?: React.ReactNode;
}

/**
 * The image-forward wishes feed shared by Home, a public profile, and a
 * wishlist's detail: a masonry of wish cards, each badged with the origin
 * store's logo, optionally led by an add tile. The column count follows the
 * device width so the same grid widens on a larger screen. A caller makes its
 * tiles open the wish by passing onPressWish; a read-only feed omits it.
 */
export default function WishMasonry({ wishes, onPressWish, leading }: WishMasonryProps) {
  const numColumns = useMasonryColumns();
  const { originFor } = useWishOrigin();

  const data = [
    ...(leading ? [{ kind: 'lead' as const }] : []),
    ...wishes.map((wish) => ({ kind: 'wish' as const, wish })),
  ];

  return (
    <MasonryGrid
      data={data}
      numColumns={numColumns}
      keyExtractor={(item) => (item.kind === 'lead' ? 'lead' : item.wish.id)}
      renderItem={(item) =>
        item.kind === 'lead' ? (
          <>{leading}</>
        ) : (
          <WishCard
            wish={item.wish}
            originLogo={originFor(item.wish)?.logoUrl}
            onPress={onPressWish ? () => onPressWish(item.wish.id) : undefined}
          />
        )
      }
    />
  );
}
