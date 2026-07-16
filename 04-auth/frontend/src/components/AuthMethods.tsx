import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import OAuthButtons from './OAuthButtons';
import AuthTextInput from './AuthTextInput';
import PrimaryButton from './PrimaryButton';
import { useToast } from './ToastProvider';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { Spacing } from '../constants/ScreenStyles';

interface AuthMethodsProps {
  /** CTA label ("Sign In" / "Sign Up") */
  ctaLabel: string;
  loading: boolean;
  /** Called with non-empty credentials only */
  onSubmit: (email: string, password: string) => void;
  /** iOS keychain hint — 'password' offers saved ones, 'newPassword' suggests one */
  passwordContentType: 'password' | 'newPassword';
  /** The footer that flips to the other auth screen */
  switchPrompt: string;
  switchLinkLabel: string;
  onSwitch: () => void;
}

/**
 * Every way into the app, in one column: OAuth buttons, an "or" rule, the
 * email/password form, and the sign-in ↔ sign-up switch. Both auth screens
 * are this component with different verbs.
 */
export default function AuthMethods({
  ctaLabel,
  loading,
  onSubmit,
  passwordContentType,
  switchPrompt,
  switchLinkLabel,
  onSwitch,
}: AuthMethodsProps) {
  const toast = useToast();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!emailAddress || !password) {
      toast.show('Enter both email and password', { type: 'error' });
      return;
    }
    onSubmit(emailAddress, password);
  };

  return (
    <>
      <OAuthButtons />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <AuthTextInput
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Email"
        onChangeText={setEmailAddress}
        keyboardType="email-address"
      />
      <AuthTextInput
        value={password}
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={passwordContentType}
        onChangeText={setPassword}
      />

      <PrimaryButton title={ctaLabel} onPress={handleSubmit} loading={loading} />

      <View style={styles.switchRow}>
        <Text style={styles.switchPrompt}>{switchPrompt} </Text>
        <TouchableOpacity onPress={onSwitch}>
          <Text style={styles.switchLink}>{switchLinkLabel}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.lightGrey,
  },
  dividerLabel: {
    ...Typography.bodySecondary,
    marginHorizontal: Spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  switchPrompt: {
    ...Typography.bodySecondary,
  },
  switchLink: {
    ...Typography.bodySecondaryStrong,
  },
});
