import React, { useState } from 'react';
import { useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import DetailAction from '../components/DetailAction';
import DetailStatusRow from '../components/DetailStatusRow';
import PhotoDetailHero from '../components/PhotoDetailHero';
import DetailTitleBlock from '../components/DetailTitleBlock';
import AddToWishlistModal from '../components/AddToWishlistModal';
import useFetch from '../hooks/useFetch';
import useOpenExternalLink from '../hooks/useOpenExternalLink';
import { fetchMyWishes } from '../services/api';

/**
 * One catalog product: its photo as the hero (a placeholder glyph stands in
 * when it has none), the title/price/blurb block it shares with the wish
 * detail, a jump to the store's page, and the Add to Wishlist action. The
 * product arrives through navigation (the catalog is curated, nothing to
 * refetch), but the add flow guards against duplicates: it reads every wish
 * across your wishlists once and, if this product's link is already saved,
 * shows "Already in Wishlist" instead of the add button (matched on link_url,
 * the field a catalog wish carries over).
 */
export default function ProductDetailScreen() {
  const route = useAppRoute<'ProductDetail'>();
  const { product } = route.params;
  const openExternalLink = useOpenExternalLink();
  const [picking, setPicking] = useState(false);

  // "Checking…" until the read resolves, then either the add button or the
  // already-saved line. `added` flips it the instant a save succeeds, without
  // re-reading; an errored check falls through to the add button (loading=false).
  const { data: myWishes, loading: checking } = useFetch(fetchMyWishes);
  const [added, setAdded] = useState(false);
  const alreadySaved =
    added || (myWishes ?? []).some((wish) => wish.link_url === product.link_url);

  return (
    <FloatingHeaderLayout title={product.name} showBack>
      <PhotoDetailHero imageUrl={product.image_url} />

      <DetailTitleBlock
        title={product.name}
        cost={product.price}
        description={product.description}
      />

      <DetailAction title="View product" variant="secondary" onPress={() => openExternalLink(product.link_url)} />
      {alreadySaved ? (
        <DetailStatusRow label="Already in Wishlist" />
      ) : (
        <DetailAction title="Add to Wishlist" onPress={() => setPicking(true)} loading={checking} />
      )}

      {/* Catalog products carry no currency, so the draft omits it: the cost
          reads in the app default symbol (the browser scrape path is what
          supplies a captured currency). storefront_id and the product photo do
          ride along, so the wish keeps its store badge and image. */}
      <AddToWishlistModal
        visible={picking}
        draft={{
          name: product.name,
          cost: product.price,
          link_url: product.link_url,
          description: product.description,
          image_url: product.image_url,
          storefront_id: product.storefront_id,
        }}
        onAdded={() => setAdded(true)}
        onClose={() => setPicking(false)}
      />
    </FloatingHeaderLayout>
  );
}
