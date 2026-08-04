import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

/**
 * One-line "label · value" readout of a useFetch result: checking
 * while in flight, the error when it failed, the caller's value once
 * resolved. ApiStatus and the account proof on Home are both this.
 */
const AsyncStatusLine: React.FC<{
  label: string;
  loading: boolean;
  error: string;
  /** What to show on success */
  value: string;
}> = ({ label, loading, error, value }) => (
  <Text style={styles.text}>
    {label} ·{' '}
    <Text style={loading ? undefined : error ? styles.bad : styles.good}>
      {loading ? 'checking…' : error ? `error — ${error}` : value}
    </Text>
  </Text>
);

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  good: {
    color: Colors.success,
  },
  bad: {
    color: Colors.danger,
  },
});

export default AsyncStatusLine;
