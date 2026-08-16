import React, { ComponentProps } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface CatalogRowProps {
  /** The glyph in the rounded fill (a storefront, a globe, a calendar). */
  icon: IoniconName;
  title: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** A one or two line blurb under the title. */
  description?: string | null;
  /** Show the trailing chevron when the row leads on to another screen. */
  showChevron?: boolean;
}

/**
 * A glyph-led row for a reference-data list: an icon in a rounded fill, a title,
 * an optional blurb, and an optional trailing chevron, all on the shared
 * outlined surface. The admin home menu, the admin life-events list, and the
 * Wish Store's "Browse real stores" link all list rows of exactly this shape,
 * differing only in the glyph, the blurb, and whether the row leads onward, so
 * the whole row lives here once and none of them respells the primitives.
 */
export default function CatalogRow({
  icon,
  title,
  onPress,
  accessibilityLabel,
  description,
  showChevron,
}: CatalogRowProps) {
  return (
    <TouchableOpacity
      style={[CommonScreenStyles.outlinedSurface, styles.row]}
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[CommonScreenStyles.center, styles.glyph]}>
        <Ionicons name={icon} size={Spacing.tileGlyphSize} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{title}</Text>
        {description ? (
          <Text style={Typography.bodySecondary} numberOfLines={2}>{description}</Text>
        ) : null}
      </View>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  glyph: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.subtleFill,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.cardTitle,
  },
});
