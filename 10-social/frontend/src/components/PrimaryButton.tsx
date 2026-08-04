import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Typography, { ChromeMaxFontSizeMultiplier } from '../constants/Typography';
import BorderRadius from '../constants/BorderRadius';
import Shadows from '../constants/Shadows';
import Opacity from '../constants/Opacity';

type Variant = 'primary' | 'secondary' | 'danger';

interface PrimaryButtonProps {
  /** Button label */
  title: string;
  onPress: () => void;
  /** Shows an ActivityIndicator instead of the label and disables presses */
  loading?: boolean;
  /** primary: brand CTA · secondary: quiet grey · danger: destructive red */
  variant?: Variant;
}

/**
 * The standard full-width CTA. Settings brought the second and third
 * variants: a quiet Cancel and a destructive Delete.
 */
const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  variant = 'primary',
}) => (
  <TouchableOpacity
    style={[styles.button, variantStyles[variant], loading && styles.disabled]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={Opacity.pressed}
  >
    {loading ? (
      <ActivityIndicator color={variant === 'secondary' ? Colors.dark : Colors.white} />
    ) : (
      <Text
        style={[styles.text, variant === 'secondary' && styles.secondaryText]}
        maxFontSizeMultiplier={ChromeMaxFontSizeMultiplier}
      >
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
  },
  disabled: {
    opacity: Opacity.disabled,
  },
  text: {
    ...Typography.button,
  },
  secondaryText: {
    color: Colors.dark,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.primary,
    ...Shadows.cta,
  },
  secondary: {
    backgroundColor: Colors.pressedFill,
  },
  danger: {
    backgroundColor: Colors.danger,
    ...Shadows.ctaDanger,
  },
});

export default PrimaryButton;
