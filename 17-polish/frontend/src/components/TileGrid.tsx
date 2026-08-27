import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Spacing } from '../constants/ScreenStyles';

/**
 * A two-column grid of equal-width cells, shared by the app's tile grids (the
 * wishlist grid, and the curated/admin storefront-card grids). Each child
 * becomes one cell; cells wrap to new rows with a consistent gutter. Width is
 * measured off the window (minus the layout's content edges and one gutter) so
 * cells are exact, not percentage-approximate. Two columns only: the app has no
 * wider-screen consumer to justify responsive breakpoints.
 */
const TileGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useWindowDimensions();
  const cellWidth =
    (width - Spacing.contentHorizontal * 2 - Spacing.md) / 2;

  // toArray (not Children.map) so a null/undefined/false child — e.g. an
  // omitted `leading` add-tile — is dropped rather than becoming an empty cell.
  // A phantom leading cell pushed a lone tile into the second column (a
  // right-aligned wishlist with dead space on the left, seen on an event's
  // single linked wishlist).
  const cells = React.Children.toArray(children);
  return (
    <View style={styles.grid}>
      {cells.map((child, i) => (
        <View key={i} style={[styles.cell, { width: cellWidth }]}>{child}</View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    marginBottom: Spacing.md,
  },
});

export default TileGrid;
