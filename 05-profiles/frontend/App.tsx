import React from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ToastProvider';
import Navigation from './src/components/Navigation';
import { tokenCache } from './src/utils/tokenCache';

export default function App() {
  return (
    <ClerkProvider
      // The publishable key is public by design (it only identifies your
      // Clerk instance) and comes from frontend/.env.local
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <SafeAreaProvider>
        <ToastProvider>
          <Navigation />
        </ToastProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
