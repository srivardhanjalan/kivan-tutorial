import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/**
 * The label above a non-FormInput form control (an image slot, the life-event
 * selector) — one spelling so those headings can't drift from each other.
 */
const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);

const styles = StyleSheet.create({
  label: {
    ...Typography.bodySecondaryStrong,
    marginBottom: Spacing.sm,
  },
});

export default FieldLabel;
