import React, { useState } from 'react';
import { useAppRoute } from '../hooks/useAppNavigation';
import FloatingHeaderLayout from '../components/layouts/FloatingHeaderLayout';
import DetailAction from '../components/DetailAction';
import ArtTile from '../components/ArtTile';
import ImagePlaceholderGlyph from '../components/ImagePlaceholderGlyph';
import DetailTitleBlock from '../components/DetailTitleBlock';
import AddToWishlistModal from '../components/AddToWishlistModal';
import useOpenExternalLink from '../hooks/useOpenExternalLink';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One catalog product: a placeholder hero (seeded products carry no image),
 * the title/price/blurb block it shares with the wish detail, a jump to the
 * store's page, and the Add to Wishlist action that opens the wishlist picker.
 * The product arrives through navigation: the catalog is curated, so there is
 * nothing to refetch here.
 */
export default function ProductDetailScreen() {
  const route = useAppRoute<'ProductDetail'>();
  const { product } = route.params;
  const openExternalLink = useOpenExternalLink();
  const [picking, setPicking] = useState(false);

  return (
    <FloatingHeaderLayout title={product.name} showBack>
      <ArtTile
        height={Spacing.detailHeroHeight}
        color={Colors.subtleFill}
        placeholder={<ImagePlaceholderGlyph size={Spacing.detailHeroGlyphSize} />}
      />

      <DetailTitleBlock
        title={product.name}
        cost={product.price}
        description={product.description}
      />

      <DetailAction title="View product" variant="secondary" onPress={() => openExternalLink(product.link_url)} />
      <DetailAction title="Add to Wishlist" onPress={() => setPicking(true)} />

      <AddToWishlistModal
        visible={picking}
        product={product}
        onClose={() => setPicking(false)}
      />
    </FloatingHeaderLayout>
  );
}
