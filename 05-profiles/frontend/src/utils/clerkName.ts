import type { useUser } from '@clerk/clerk-expo';

/** "First Last" from whatever parts the Clerk profile has — '' if none.
    Callers choose their own fallback (email on Home, "Add" in Settings). */
export const clerkFullName = (user: ReturnType<typeof useUser>['user']): string =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ');
