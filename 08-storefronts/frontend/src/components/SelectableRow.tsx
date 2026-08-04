import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import Colors from '../constants/Colors';
import Opacity from '../constants/Opacity';
import Typography from '../constants/Typography';

interface SelectableRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * One row of a single-select list: the app's raised outlined surface with a
 * label and a checkmark when chosen. The add-to-wishlist picker and the store
 * category filter both stack these, so the row's look and its selected accent
 * (a brand-colored border and label) live here once instead of drifting apart.
 */
const SelectableRow: React.FC<SelectableRowProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={Opacity.pressed}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    style={[CommonScreenStyles.outlinedSurface, styles.row, selected && styles.rowSelected]}
  >
    <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
      {label}
    </Text>
    {selected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Layered over CommonScreenStyles.outlinedSurface (the shared raised-card
  // look): this adds only the row layout and a tighter vertical pad than the
  // surface's all-round lg
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowSelected: {
    borderColor: Colors.primary,
  },
  label: {
    ...Typography.bodySecondaryStrong,
    flex: 1,
  },
  labelSelected: {
    color: Colors.primary,
  },
});

export default SelectableRow;
