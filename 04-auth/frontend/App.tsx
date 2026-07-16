import React from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ToastProvider';
import Navigation from './src/components/Navigation';
import { clerkConfig } from './src/config/clerk';

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkConfig.publishableKey} tokenCache={clerkConfig.tokenCache}>
      <SafeAreaProvider>
        <ToastProvider>
          <Navigation />
        </ToastProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
