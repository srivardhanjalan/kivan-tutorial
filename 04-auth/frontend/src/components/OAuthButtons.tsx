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

interface OAuthProvider {
  strategy: 'oauth_apple' | 'oauth_google';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Adding a provider is one line here (plus enabling it in the Clerk
// dashboard) — the same config-as-data idiom as config/tabs.ts
const PROVIDERS: readonly OAuthProvider[] = [
  { strategy: 'oauth_apple', label: 'Continue with Apple', icon: 'logo-apple' },
  { strategy: 'oauth_google', label: 'Continue with Google', icon: 'logo-google' },
];

function OAuthButton({ strategy, label, icon }: OAuthProvider) {
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
          <Ionicons name={icon} size={20} color={Colors.dark} style={styles.icon} />
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** One button per configured OAuth provider, in PROVIDERS order. */
export default function OAuthButtons() {
  return (
    <>
      {PROVIDERS.map((provider) => (
        <OAuthButton key={provider.strategy} {...provider} />
      ))}
    </>
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
