import React from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { Spacing } from '../constants/ScreenStyles';

/**
 * A two-column grid of equal-width cells — the wishlists grid on My Stuff and
 * the wishes grid on a wishlist share it. Each child becomes one cell; cells
 * wrap to new rows with a consistent gutter. Width is measured off the window
 * (minus the layout's content edges and one gutter) so cells are exact, not
 * percentage-approximate. Two columns only: the app has no wider-screen
 * consumer to justify responsive breakpoints.
 */
const TileGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useWindowDimensions();
  const cellWidth =
    (width - Spacing.contentHorizontal * 2 - Spacing.md) / 2;

  return (
    <View style={styles.grid}>
      {React.Children.map(children, (child) => (
        <View style={[styles.cell, { width: cellWidth }]}>{child}</View>
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
