/**
 * The API client. EXPO_PUBLIC_API_URL comes from frontend/.env.local
 * (gitignored) — your App Runner URL once deployed, or http://localhost:8000
 * against a local `python run.py`.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/** The user record as the backend's JIT provisioning writes it */
export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Navigation wires Clerk's getToken in here once at sign-in, so every
// request picks up a fresh session JWT without screens handling tokens.
let getAuthToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>): void {
  getAuthToken = getter;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set (frontend/.env.local)');
  }
  const token = getAuthToken ? await getAuthToken() : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`);
  }
  return res;
}

/**
 * Resolves when the backend answers /health, rejects with a human-readable
 * reason otherwise. Callers own presentation; this owns diagnosis.
 */
export async function fetchHealth(): Promise<void> {
  await request('/health');
}

/** The current user's backend record — provisioned on this very call if
    it's the user's first authenticated request. */
export async function fetchCurrentUser(): Promise<User> {
  const res = await request('/users/me');
  return res.json();
}

export async function fetchOnboardingCompleted(): Promise<boolean> {
  const res = await request('/users/me/onboarding');
  const data = await res.json();
  return data.onboarding_completed;
}

export async function completeOnboarding(): Promise<void> {
  await request('/users/me/onboarding/complete', { method: 'POST' });
}
