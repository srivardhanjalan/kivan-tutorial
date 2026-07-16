import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
  Easing,
} from 'react-native';
import Colors from '../constants/Colors';
import BorderRadius from '../constants/BorderRadius';
import { CommonScreenStyles } from '../constants/ScreenStyles';
import AppConfig from '../config/app';

interface KivanLoaderProps {
  size?: number;
}

const KivanLoader: React.FC<KivanLoaderProps> = ({ size = 80 }) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotation animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse animation
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
    <View style={CommonScreenStyles.center}>
      <View style={[CommonScreenStyles.center, styles.glassContainer, { width: size, height: size }]}>
        {/* Animated Kivan logo */}
        <Animated.View
          style={[
            CommonScreenStyles.center,
            {
              transform: [
                { rotate: spin },
                { scale: pulseValue },
              ],
            },
          ]}
        >
          <Image
            source={AppConfig.branding.logo}
            style={[styles.logo, { width: size * 0.6, height: size * 0.6 }]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
  },
  logo: {
    // Full opacity to keep original vibrant colors
  },
});

export default KivanLoader;
