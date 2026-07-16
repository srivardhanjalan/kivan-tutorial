import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Typography from '../constants/Typography';
import { CommonScreenStyles, Spacing } from '../constants/ScreenStyles';
import Opacity from '../constants/Opacity';
import useAuthAction from '../hooks/useAuthAction';

// Completes the pending browser session when the OAuth redirect returns
WebBrowser.maybeCompleteAuthSession();

interface OAuthButtonProps {
  strategy: 'oauth_google' | 'oauth_apple';
  label: string;
  icon: React.ReactNode;
}

function OAuthButton({ strategy, label, icon }: OAuthButtonProps) {
  const { startOAuthFlow } = useOAuth({ strategy });
  const { loading, run } = useAuthAction();

  const onPress = () => {
    run(async () => {
      const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow();

      // First-time OAuth users come back on signUp, returning ones on signIn
      const sessionId =
        createdSessionId || signIn?.createdSessionId || signUp?.createdSessionId;
      if (sessionId && setActive) {
        await setActive({ session: sessionId });
      }
      // No backend sync call: the backend provisions the user record
      // automatically on the first authenticated request.
    }, 'Sign-in failed. Please try again.');
  };

  return (
    <TouchableOpacity
      style={[CommonScreenStyles.outlinedSurface, styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textSecondary} />
      ) : (
        <View style={styles.buttonContent}>
          <View style={styles.icon}>{icon}</View>
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function GoogleSignInButton() {
  return (
    <OAuthButton
      strategy="oauth_google"
      label="Continue with Google"
      icon={<Ionicons name="logo-google" size={20} color={Colors.dark} />}
    />
  );
}

export function AppleSignInButton() {
  return (
    <OAuthButton
      strategy="oauth_apple"
      label="Continue with Apple"
      icon={<Ionicons name="logo-apple" size={20} color={Colors.dark} />}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: Opacity.disabled,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.md,
  },
  buttonText: {
    ...Typography.bodySecondaryStrong,
  },
});
