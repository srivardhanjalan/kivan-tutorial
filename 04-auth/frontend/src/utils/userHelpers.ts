import type { useUser } from '@clerk/clerk-expo';

type User = ReturnType<typeof useUser>['user'];

/** "First Last" → first → last → email — whatever the profile can offer. */
export const getUserDisplayName = (user: User): string => {
  if (!user) return '';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.emailAddresses[0]?.emailAddress || '';
};
