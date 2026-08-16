import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../constants/ScreenStyles';

interface MasonryGridProps<T> {
  data: T[];
  /** How many columns to lay the items across; the screen picks it off its
      width so a wider device shows more columns. */
  numColumns?: number;
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
}

/**
 * A masonry grid: items keep their own heights (an image-forward tile is as
 * tall as its photo) instead of snapping to a uniform cell, so the columns
 * stagger. Items are dealt round-robin across the columns by index — simple and
 * order-stable, though not height-balanced (a tall item can leave its column
 * longer than the others). The screen owns the column count so the same grid
 * widens on a larger device.
 */
function MasonryGrid<T>({ data, numColumns = 2, renderItem, keyExtractor }: MasonryGridProps<T>) {
  const columns: { item: T; index: number }[][] = Array.from({ length: numColumns }, () => []);
  data.forEach((item, index) => {
    columns[index % numColumns].push({ item, index });
  });

  return (
    <View style={styles.grid}>
      {columns.map((cells, col) => (
        <View key={col} style={styles.column}>
          {cells.map(({ item, index }) => (
            <View key={keyExtractor(item, index)} style={styles.cell}>
              {renderItem(item, index)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  column: {
    flex: 1,
    gap: Spacing.md,
  },
  cell: {
    width: '100%',
  },
});

export default MasonryGrid;
