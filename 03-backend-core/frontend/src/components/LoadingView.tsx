import React from 'react';
import { View } from 'react-native';
import KivanLoader from './KivanLoader';
import { CommonScreenStyles } from '../constants/ScreenStyles';

/** Full-screen branded loading state. */
const LoadingView: React.FC = () => (
  <View style={[CommonScreenStyles.container, CommonScreenStyles.center]}>
    <KivanLoader />
  </View>
);

export default LoadingView;
