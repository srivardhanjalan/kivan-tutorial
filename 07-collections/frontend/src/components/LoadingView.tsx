import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles } from '../constants/ScreenStyles';
import BrandMark from './BrandMark';

/** Full-screen branded loading state: the brand mark spinning and pulsing
    in a white disc, centered on the app background. */
const LoadingView: React.FC = () => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, [spinValue, pulseValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[CommonScreenStyles.container, CommonScreenStyles.center]}>
      <View style={[CommonScreenStyles.center, styles.disc]}>
        <Animated.View style={{ transform: [{ rotate: spin }, { scale: pulseValue }] }}>
          <BrandMark size={48} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  disc: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
  },
});

export default LoadingView;
