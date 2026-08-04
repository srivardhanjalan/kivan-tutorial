import * as SecureStore from 'expo-secure-store';

/**
 * Clerk's session token cache, backed by the device keychain. Errors
 * degrade to "no cached token" — Clerk falls back to a fresh sign-in
 * rather than crashing. (A web storage backend joins when a step actually
 * makes the web target build.)
 */
export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },
};
