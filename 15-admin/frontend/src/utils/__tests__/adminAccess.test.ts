import { isAdmin } from '../adminAccess';

/**
 * The role gate the Settings entry reads: the admin row shows only when isAdmin
 * is true. Testing the predicate directly proves "shown for admin, hidden for
 * everyone else" without rendering the screen (the render is E2E, per the repo
 * convention).
 */
describe('isAdmin', () => {
  it('is true for an admin (the Settings row shows)', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
  });

  it('is false for a plain user (the row stays hidden)', () => {
    expect(isAdmin({ role: 'user' })).toBe(false);
  });

  it('is false while the record is still loading', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
