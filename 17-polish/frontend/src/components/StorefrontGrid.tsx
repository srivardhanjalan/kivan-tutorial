import React from 'react';
import TileGrid from './TileGrid';
import StorefrontCard from './StorefrontCard';
import type { Storefront } from '../services/api';

/**
 * The image-forward storefront card grid — the sibling of {@link ProductMasonry}
 * and {@link BrandWall}. The Wish Store tab and the admin catalog both fill it;
 * each card opens where its screen sends it (the store's products, or the edit
 * form), passed as `onPressStorefront`.
 */
export default function StorefrontGrid({
  storefronts,
  onPressStorefront,
}: {
  storefronts: Storefront[] | undefined;
  onPressStorefront: (storefront: Storefront) => void;
}) {
  return (
    <TileGrid>
      {storefronts?.map((storefront) => (
        <StorefrontCard
          key={storefront.id}
          storefront={storefront}
          onPress={() => onPressStorefront(storefront)}
        />
      ))}
    </TileGrid>
  );
}
