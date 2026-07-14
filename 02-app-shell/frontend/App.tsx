import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './src/components/ToastProvider';
import TabNavigation from './src/components/TabNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NavigationContainer>
          <TabNavigation />
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
