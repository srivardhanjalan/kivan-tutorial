import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import TabNavigation from './TabNavigation';
import OnboardingTutorial from './OnboardingTutorial';
import LoadingView from './LoadingView';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import {
  setAuthTokenGetter,
  fetchOnboardingCompleted,
  completeOnboarding,
} from '../services/api';

/**
 * The auth gate: signed out shows the sign-in/sign-up pair (a simple local
 * swap — a stack navigator joins when a later step first pushes a real
 * screen), signed in shows the tab shell, plus the one-time first-run
 * tutorial. Also wires Clerk session tokens into the API client.
 */
export default function Navigation() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [authScreen, setAuthScreen] = useState<'signIn' | 'signUp'>('signIn');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Wired during render, not in an effect: children fire authenticated
  // requests from their own mount effects, which run before a parent's.
  setAuthTokenGetter(() => getToken());

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
        <TabNavigation />
      </NavigationContainer>
      <OnboardingTutorial visible={showOnboarding} onDismiss={handleOnboardingDismiss} />
    </>
  );
}
