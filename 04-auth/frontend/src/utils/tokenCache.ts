import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Clerk's session token cache: the device keychain via expo-secure-store on
 * native, sessionStorage on web. Errors degrade to "no cached token" — Clerk
 * falls back to a fresh sign-in rather than crashing.
 */
export const tokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === 'web') {
        return sessionStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS === 'web') {
        sessionStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },
  async deleteToken(key: string) {
    try {
      if (Platform.OS === 'web') {
        sessionStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting token:', error);
    }
  },
};
