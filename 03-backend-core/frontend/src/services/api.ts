/**
 * The API client's root. EXPO_PUBLIC_API_URL comes from frontend/.env.local
 * (gitignored) — your App Runner URL once deployed, or http://localhost:8000
 * against a local `python run.py`.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Resolves when the backend answers /health, rejects with a human-readable
 * reason otherwise. Callers own presentation; this owns diagnosis.
 */
export async function fetchHealth(): Promise<void> {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set (frontend/.env.local)');
  }
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`health check failed: ${res.status}`);
  }
}
