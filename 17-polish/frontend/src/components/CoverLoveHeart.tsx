import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useOptimisticToggle from '../hooks/useOptimisticToggle';
import { loveWishlist, unloveWishlist } from '../services/api';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface CoverLoveHeartProps {
  wishlistId: string;
  initialLoved: boolean;
  initialCount: number;
}

/**
 * Love as a heart floated on the wishlist's cover band: the same optimistic
 * toggle the outlined pill carried (via {@link useOptimisticToggle}), rendered
 * as a translucent cover control that fills red when loved and wears its tally
 * in a corner badge. Mounts once the wishlist and love status are loaded, so
 * its fill and count are known.
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
    <TouchableOpacity
      onPress={toggle}
      disabled={loading}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={loved ? 'Loved' : 'Love this wishlist'}
      style={[CommonScreenStyles.center, styles.heart, loved && styles.heartLoved, loading && CommonScreenStyles.dimmed]}
    >
      <Ionicons name={loved ? 'heart' : 'heart-outline'} size={20} color={Colors.white} />
      {count > 0 && (
        <View style={[CommonScreenStyles.center, styles.badge]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heart: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.coverScrim,
    borderWidth: 2,
    borderColor: Colors.coverHairline,
  },
  heartLoved: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
  },
});

export default CoverLoveHeart;
