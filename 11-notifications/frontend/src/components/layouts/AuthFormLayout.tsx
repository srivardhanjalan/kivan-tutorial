import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Typography from '../../constants/Typography';
import { CommonScreenStyles, Spacing } from '../../constants/ScreenStyles';
import BrandMark from '../BrandMark';

interface AuthFormLayoutProps {
  /** Screen heading (e.g. "Welcome to Kivan") */
  title: string;
  /** Sub-heading below the title */
  subtitle: string;
  /** Form fields, buttons, footer links */
  children: React.ReactNode;
}

/**
 * Scaffold for the auth screens: keyboard-avoiding centered column with
 * the brand mark, title and subtitle above the form content.
 */
const AuthFormLayout: React.FC<AuthFormLayoutProps> = ({ title, subtitle, children }) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={CommonScreenStyles.container}
  >
    <View style={styles.content}>
      <View style={styles.logoContainer}>
        <BrandMark />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {children}
    </View>
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  title: {
    ...Typography.largeTitle,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodySecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
});

export default AuthFormLayout;
