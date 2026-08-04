import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useOptimisticToggle from '../hooks/useOptimisticToggle';
import { loveWishlist, unloveWishlist } from '../services/api';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface LoveButtonProps {
  wishlistId: string;
  initialLoved: boolean;
  initialCount: number;
}

/**
 * The heart on a wishlist you're viewing: love it, and the count moves with
 * you. Optimistic — the fill and tally flip on tap and roll back with a toast
 * if the request fails. Mounts once the wishlist and love status are loaded,
 * so its initial fill and count are known.
 */
const LoveButton: React.FC<LoveButtonProps> = ({ wishlistId, initialLoved, initialCount }) => {
  const { on: loved, count, loading, toggle } = useOptimisticToggle({
    initialOn: initialLoved,
    initialCount,
    turnOn: () => loveWishlist(wishlistId),
    turnOff: () => unloveWishlist(wishlistId),
    errorMessage: 'Could not update love',
  });

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={loading}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={loved ? 'Loved' : 'Love this wishlist'}
      style={[CommonScreenStyles.outlinedPill, styles.pill, loading && CommonScreenStyles.dimmed]}
    >
      <Ionicons
        name={loved ? 'heart' : 'heart-outline'}
        size={Spacing.chromeIconSize}
        color={loved ? Colors.primary : Colors.grey}
      />
      <Text style={styles.count}>{count}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  count: {
    ...Typography.bodySecondaryStrong,
  },
});

export default LoveButton;
