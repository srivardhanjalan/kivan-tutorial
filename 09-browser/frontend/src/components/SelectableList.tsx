import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../constants/ScreenStyles';

/**
 * A single-select column: the gapped container that stacks SelectableRows above
 * a modal's buttons. The add-to-wishlist picker and the store category filter
 * both raise the same list, so its spacing lives here once with the row it pairs
 * with instead of being re-declared per modal.
 */
const SelectableList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.list}>{children}</View>
);

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
});

export default SelectableList;
