import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

interface CoverActionButtonProps {
  /** The idle icon (heart-outline, settings-outline). */
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** The icon shown when active (a filled heart); defaults to `icon`. */
  activeIcon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Active fills the disc in the accent color (a loved/followed state). */
  active?: boolean;
  /** A tally in a corner badge, shown when > 0 (love/follower count). */
  count?: number;
  onPress: () => void;
  loading?: boolean;
  accessibilityLabel: string;
}

/**
 * A circular control floated on a cover band: a translucent dark disc with a
 * light hairline that reads against any cover photo, filling the accent color
 * when active and wearing an optional count badge. The one spelling of a
 * cover-floated action — the wishlist love heart, the profile follow heart, and
 * the home settings button all render through it, so they can't drift apart.
 */
const CoverActionButton: React.FC<CoverActionButtonProps> = ({
  icon,
  activeIcon,
  active = false,
  count = 0,
  onPress,
  loading = false,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={[CommonScreenStyles.center, styles.disc, active && styles.discActive, loading && CommonScreenStyles.dimmed]}
  >
    <Ionicons name={active && activeIcon ? activeIcon : icon} size={20} color={Colors.white} />
    {count > 0 && (
      <View style={[CommonScreenStyles.center, styles.badge]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  disc: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.coverScrim,
    borderWidth: 2,
    borderColor: Colors.coverHairline,
  },
  discActive: {
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

export default CoverActionButton;
