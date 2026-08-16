import * as SecureStore from 'expo-secure-store';

const LAST_USED_KEY = 'last_used_wishlist_id';

/**
 * Remembers the wishlist you last added a wish to, so the add-to-wishlist modal
 * preselects it — adding to the list you're actively filling becomes a single
 * confirm. Backed by the device keychain like the Clerk token cache; a failed
 * read/write degrades to "no memory" (the modal falls back to the first
 * wishlist) rather than throwing.
 */
export async function getLastUsedWishlistId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LAST_USED_KEY);
  } catch {
    return null;
  }
}

export async function setLastUsedWishlistId(id: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_USED_KEY, id);
  } catch {
    // A failed write just means the next open falls back to the first wishlist.
  }
}
