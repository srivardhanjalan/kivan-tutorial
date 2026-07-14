import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import KivanLoader from './KivanLoader';
import Colors from '../constants/Colors';
import { Spacing } from '../constants/ScreenStyles';

interface LoadingViewProps {
  /** Optional message shown below the loader */
  message?: string;
  /** Loader size (default: 80) */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-screen centered loading state used while a screen fetches its data.
 * Wraps KivanLoader in the standard loading container.
 */
const LoadingView: React.FC<LoadingViewProps> = ({ message, size = 80, style }) => (
  <View style={[styles.container, style]}>
    <KivanLoader size={size} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  message: {
    marginTop: Spacing.lg,
    fontSize: 15,
    color: Colors.grey,
    textAlign: 'center',
  },
});

export default LoadingView;
