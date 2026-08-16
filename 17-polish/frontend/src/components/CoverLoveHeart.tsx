import React from 'react';
import CoverActionButton from './CoverActionButton';
import useOptimisticToggle from '../hooks/useOptimisticToggle';
import { loveWishlist, unloveWishlist } from '../services/api';

interface CoverLoveHeartProps {
  wishlistId: string;
  initialLoved: boolean;
  initialCount: number;
}

/**
 * Love as a heart floated on the wishlist's cover band: the same optimistic
 * toggle the outlined pill carried (via {@link useOptimisticToggle}), rendered
 * through the shared {@link CoverActionButton} so it fills red when loved and
 * wears its tally in a corner badge, identical to the profile follow heart.
 * Mounts once the wishlist and love status are loaded, so its fill and count
 * are known.
 */
const CoverLoveHeart: React.FC<CoverLoveHeartProps> = ({ wishlistId, initialLoved, initialCount }) => {
  const { on: loved, count, loading, toggle } = useOptimisticToggle({
    initialOn: initialLoved,
    initialCount,
    turnOn: () => loveWishlist(wishlistId),
    turnOff: () => unloveWishlist(wishlistId),
    errorMessage: 'Could not update love',
  });

  return (
    <CoverActionButton
      icon="heart-outline"
      activeIcon="heart"
      active={loved}
      count={count}
      loading={loading}
      onPress={toggle}
      accessibilityLabel={loved ? 'Loved' : 'Love this wishlist'}
    />
  );
};

export default CoverLoveHeart;
