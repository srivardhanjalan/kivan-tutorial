import React from 'react';
import ArtTile from './ArtTile';
import ImagePlaceholderGlyph from './ImagePlaceholderGlyph';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

/**
 * The photo hero at the top of a detail screen: the shared ArtTile at the
 * detail-hero height with a neutral wash, showing the item's photo or the
 * image-glyph placeholder when it has none. The wish detail and the product
 * detail lead with the identical block, so its height, wash, and placeholder
 * live here once instead of drifting between them. (The wishlist and event
 * details lead with a different flavor: a life-event pastel and glyph, which
 * lives once in its sibling {@link LifeEventDetailHero}.)
 */
const PhotoDetailHero: React.FC<{ imageUrl?: string | null }> = ({ imageUrl }) => (
  <ArtTile
    height={Spacing.detailHeroHeight}
    color={Colors.subtleFill}
    imageUrl={imageUrl}
    placeholder={<ImagePlaceholderGlyph size={Spacing.detailHeroGlyphSize} />}
  />
);

export default PhotoDetailHero;
