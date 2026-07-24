import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import TabNavigation from './TabNavigation';
import OnboardingTutorial from './OnboardingTutorial';
import LoadingView from './LoadingView';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WishlistFormScreen from '../screens/WishlistFormScreen';
import WishlistDetailScreen from '../screens/WishlistDetailScreen';
import WishFormScreen from '../screens/WishFormScreen';
import WishDetailScreen from '../screens/WishDetailScreen';
import {
  setAuthTokenGetter,
  fetchOnboardingCompleted,
  completeOnboarding,
} from '../services/api';
import type { Wishlist, Wish } from '../services/api';

/** The signed-in stack: the tab shell, plus every screen pushed over it */
export type RootStackParamList = {
  Tabs: undefined;
  Settings: undefined;
  /** Create (no param) or edit (the wishlist) one wishlist */
  WishlistForm: { wishlist?: Wishlist };
  WishlistDetail: { wishlistId: string };
  /** Create (wishlist only) or edit (the wish) one wish */
  WishForm: { wishlistId: string; wish?: Wish };
  WishDetail: { wishId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The auth gate: signed out shows the sign-in/sign-up pair (a simple local
 * swap), signed in shows a stack — the tab shell at its root, Settings the
 * first screen ever pushed over it. Also shows the one-time first-run
 * tutorial and wires Clerk session tokens into the API client.
 */
export default function Navigation() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [authScreen, setAuthScreen] = useState<'signIn' | 'signUp'>('signIn');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Wired during render, not in an effect: children fire authenticated
  // requests from their own mount effects, which run before a parent's.
  setAuthTokenGetter(() => getToken());

  // Signing out always lands on Sign In, wherever the toggle was left
  useEffect(() => {
    if (!isSignedIn) setAuthScreen('signIn');
  }, [isSignedIn]);

  // On sign-in, ask the backend whether the first-run tutorial was already
  // completed (it's on the user record, so reinstalls don't replay it).
  // This is often the user's very first authenticated request — the one
  // that JIT-provisions their record.
  useEffect(() => {
    if (!isSignedIn) return;
    let mounted = true;
    fetchOnboardingCompleted()
      .then((done) => mounted && setShowOnboarding(!done))
      .catch((e: Error) => console.warn(`Onboarding check skipped: ${e.message}`));
    return () => {
      mounted = false;
    };
  }, [isSignedIn]);

  const handleOnboardingDismiss = () => {
    setShowOnboarding(false);
    completeOnboarding().catch((e: Error) =>
      console.warn(`Could not persist onboarding completion: ${e.message}`)
    );
  };

  if (!isLoaded) {
    return <LoadingView />;
  }

  if (!isSignedIn) {
    return authScreen === 'signIn' ? (
      <SignInScreen onSwitchToSignUp={() => setAuthScreen('signUp')} />
    ) : (
      <SignUpScreen onSwitchToSignIn={() => setAuthScreen('signIn')} />
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={TabNavigation} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="WishlistForm" component={WishlistFormScreen} />
          <Stack.Screen name="WishlistDetail" component={WishlistDetailScreen} />
          <Stack.Screen name="WishForm" component={WishFormScreen} />
          <Stack.Screen name="WishDetail" component={WishDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <OnboardingTutorial visible={showOnboarding} onDismiss={handleOnboardingDismiss} />
    </>
  );
}
