import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

/**
 * A detail-screen success line: a green check and a strong label, sitting above
 * the actions. The wish detail's "Fulfilled" and the product detail's "Already
 * in Wishlist" are the same affirmative status, so the icon, accent, layout,
 * and spacing live here once instead of drifting between the two screens; only
 * the label varies.
 */
const DetailStatusRow: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.row}>
    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  label: {
    ...Typography.bodySecondaryStrong,
    color: Colors.success,
  },
});

export default DetailStatusRow;
