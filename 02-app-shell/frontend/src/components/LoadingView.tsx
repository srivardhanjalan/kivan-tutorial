import React from 'react';
import { View, StyleSheet } from 'react-native';
import KivanLoader from './KivanLoader';
import Colors from '../constants/Colors';

/** Full-screen branded loading state. */
const LoadingView: React.FC = () => (
  <View style={styles.container}>
    <KivanLoader />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});

export default LoadingView;
