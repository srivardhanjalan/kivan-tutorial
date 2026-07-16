import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Colors from '../constants/Colors';
import Typography, { ChromeMaxFontSizeMultiplier } from '../constants/Typography';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Opacity from '../constants/Opacity';

interface PrimaryButtonProps {
  /** Button label */
  title: string;
  onPress: () => void;
  /** Shows an ActivityIndicator instead of the label and disables presses */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The standard full-width CTA: brand-colored fill with a soft brand shadow.
 * Variants join when a screen first needs one.
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  style,
}) => (
  <TouchableOpacity
    style={[styles.button, loading && styles.disabled, style]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={Colors.white} />
    ) : (
      <Text style={styles.text} maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier}>
        {title}
      </Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.cta,
  },
  disabled: {
    opacity: Opacity.disabled,
  },
  text: {
    ...Typography.button,
  },
});

export default PrimaryButton;
