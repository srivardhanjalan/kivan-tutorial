import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Which storage backs the cache, chosen once: the device keychain on
// native, sessionStorage on web.
const store =
  Platform.OS === 'web'
    ? {
        get: async (key: string) => sessionStorage.getItem(key),
        set: async (key: string, value: string) => {
          sessionStorage.setItem(key, value);
        },
        remove: async (key: string) => {
          sessionStorage.removeItem(key);
        },
      }
    : {
        get: (key: string) => SecureStore.getItemAsync(key),
        set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        remove: (key: string) => SecureStore.deleteItemAsync(key),
      };

/**
 * Clerk's session token cache. Errors degrade to "no cached token" — Clerk
 * falls back to a fresh sign-in rather than crashing.
 */
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await store.get(key);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await store.set(key, value);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },
  async deleteToken(key: string) {
    try {
      await store.remove(key);
    } catch (error) {
      console.error('Error deleting token:', error);
    }
  },
};
