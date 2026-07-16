import { tokenCache } from '../utils/tokenCache';

/**
 * ClerkProvider config. The publishable key is public by design (it only
 * identifies your Clerk instance) and comes from frontend/.env.local.
 */
export const clerkConfig = {
  publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  tokenCache,
};
