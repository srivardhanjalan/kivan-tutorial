import React, { ComponentProps } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** A labelled meta line under the title: a muted glyph beside a muted label
    (a product count, a country). */
interface RowMeta {
  icon: IoniconName;
  text: string;
}

interface CatalogRowProps {
  /** The glyph in the rounded fill (a storefront, a globe), shown when the row
      has no logo. */
  icon: IoniconName;
  /** The row's logo, filling the rounded tile in place of the glyph when set (a
      store's or brand's mark); a row with none falls back to the glyph. */
  logoUrl?: string | null;
  title: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** A one or two line blurb under the title. */
  description?: string | null;
  /** Labelled meta lines (a count, a country), each a glyph beside a label. */
  meta?: RowMeta[];
  /** Show the trailing chevron when the row leads on to another screen. */
  showChevron?: boolean;
}

/**
 * A glyph-led row for a reference-data list: an icon in a rounded fill, a
 * title, an optional blurb, labelled meta lines, and an optional trailing
 * chevron, all on the shared outlined surface. The curated Wish Store
 * (StorefrontsScreen) and the real-store directory (BrandsScreen) list rows of
 * exactly this shape, and differ only in the glyph, the blurb, the meta lines,
 * and whether the row leads onward, so the whole row lives here once. Callers
 * pass data (a country, a count), not markup, so neither screen respells the
 * row or reaches for the primitives.
 */
export default function CatalogRow({
  icon,
  logoUrl,
  title,
  onPress,
  accessibilityLabel,
  description,
  meta,
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
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name={icon} size={Spacing.tileGlyphSize} color={Colors.primary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{title}</Text>
        {description ? (
          <Text style={Typography.bodySecondary} numberOfLines={2}>{description}</Text>
        ) : null}
        {meta?.map((line) => (
          <View key={line.text} style={styles.metaLine}>
            <Ionicons name={line.icon} size={13} color={Colors.textSecondary} />
            <Text style={Typography.bodySecondary}>{line.text}</Text>
          </View>
        ))}
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
    // Clip a logo image to the rounded tile
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.cardTitle,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
