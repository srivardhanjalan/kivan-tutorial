import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';

/**
 * The standard text field: the shared outlined surface with a muted
 * placeholder — auth forms and Settings alike. A thin wrapper so every
 * field looks identical.
 */
const FormInput: React.FC<TextInputProps> = (props) => (
  <TextInput
    style={[CommonScreenStyles.outlinedSurface, styles.input]}
    placeholderTextColor={Colors.textMuted}
    {...props}
  />
);

const styles = StyleSheet.create({
  input: {
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.lg,
  },
});

export default FormInput;
