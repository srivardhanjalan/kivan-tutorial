import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

type StatusTone = 'neutral' | 'good' | 'bad';

/**
 * One-line "label · value" status readout with a tone color on the value.
 * ApiStatus and the account proof on Home both speak through this.
 */
const StatusLine: React.FC<{ label: string; value: string; tone?: StatusTone }> = ({
  label,
  value,
  tone = 'neutral',
}) => (
  <Text style={styles.text}>
    {label} · <Text style={toneStyles[tone]}>{value}</Text>
  </Text>
);

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
});

const toneStyles = StyleSheet.create({
  neutral: {},
  good: { color: Colors.success },
  bad: { color: Colors.danger },
});

export default StatusLine;
