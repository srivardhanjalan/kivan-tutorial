import type { User } from '../services/api';

/**
 * The one place that decides who sees the admin surface. A user is an admin
 * only when their role is exactly "admin"; a null record (still loading) or any
 * other role is not, so the Settings entry stays hidden until the backend
 * confirms the role. Gating lives here once so the Settings row and any later
 * caller read the same rule, and so the rule is unit-testable without rendering
 * a screen.
 */
export function isAdmin(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === 'admin';
}
