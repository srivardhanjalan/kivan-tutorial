import React from 'react';
import { View, Image, Text, TouchableOpacity, useWindowDimensions, StyleSheet } from 'react-native';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Typography from '../constants/Typography';
import Opacity from '../constants/Opacity';
import type { Brand } from '../services/api';

const WALL_COLUMNS = 3;

/** One brand in the wall: a square tile centering the brand's mark, or its name
    when it has no logo. `width` is the wall's measured cell so tiles are exact
    squares. The image-forward replacement for the directory row's small logo. */
function BrandTile({ brand, width, onPress }: { brand: Brand; width: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={Opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={brand.name}
      style={[CommonScreenStyles.center, styles.tile, { width }]}
    >
      {brand.logo_url ? (
        <Image source={{ uri: brand.logo_url }} style={styles.logo} resizeMode="contain" />
      ) : (
        <Text style={styles.fallback} numberOfLines={2} adjustsFontSizeToFit>
          {brand.name}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface BrandWallProps {
  brands: Brand[];
  onPressBrand: (brand: Brand) => void;
}

/**
 * The image-forward brand logo wall: brands tiled as exact squares, several to
 * a row. The public directory (grouped by category) and the admin directory
 * both fill it; each tile opens where its screen sends it (the in-app browser,
 * or the edit form). The square size is measured off the window — the content
 * area minus the inter-tile gaps, divided across the columns — so the tiles are
 * true squares, not percentages.
 */
export default function BrandWall({ brands, onPressBrand }: BrandWallProps) {
  const { width } = useWindowDimensions();
  const cellWidth =
    (width - Spacing.contentHorizontal * 2 - Spacing.sm * (WALL_COLUMNS - 1)) / WALL_COLUMNS;

  return (
    <View style={styles.wall}>
      {brands.map((brand) => (
        <BrandTile
          key={brand.id}
          brand={brand}
          width={cellWidth}
          onPress={() => onPressBrand(brand)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tile: {
    aspectRatio: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.card,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    ...Typography.bodySecondaryStrong,
    textAlign: 'center',
  },
});
