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
  cover_photo: string | null;
  birthday: string | null;
  birthday_prompt_dismissed: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/** The editable slice of the profile — send only what changed */
export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  birthday?: string;
  birthday_prompt_dismissed?: boolean;
  /** Permanent S3 URL of the profile photo, from an upload's photo_url */
  image_url?: string;
  /** Permanent S3 URL of the cover photo, from an upload's photo_url */
  cover_photo?: string;
}

/** The image slots this app uploads for — the S3 path is keyed on it.
    Collections add art for a wishlist tile and a wish card. */
export type ResourceType =
  | 'profile_photo'
  | 'cover_photo'
  | 'wishlist_photo'
  | 'wish_photo';

/** Extensions the signed-url endpoint accepts (drives the S3 key + MIME) */
export type FileExtension = 'jpeg' | 'png' | 'gif' | 'webp';

/** POST /upload/signed-url body */
export interface SignedUrlRequest {
  resource_type: ResourceType;
  file_extension: FileExtension;
}

/** POST /upload/signed-url response */
export interface SignedUrlResponse {
  /** Presigned PUT URL — the raw bytes go here */
  upload_url: string;
  /** Permanent URL to persist on the user record once claimed */
  photo_url: string;
}

// Navigation wires Clerk's getToken in here, so every request picks up a
// fresh session JWT without screens handling tokens.
let getAuthToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>): void {
  getAuthToken = getter;
}

// Every error is a human-readable reason (missing env var, or which path
// failed with what status) — callers own presentation, this owns diagnosis
async function request(path: string, init?: RequestInit): Promise<Response> {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set (frontend/.env.local)');
  }
  const token = getAuthToken ? await getAuthToken() : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`);
  }
  return res;
}

/** Resolves when the backend answers /health. */
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

/** PUT the changed profile fields; returns the updated record. */
export async function updateProfile(update: ProfileUpdate): Promise<User> {
  const res = await request('/users/me', {
    method: 'PUT',
    body: JSON.stringify(update),
  });
  return res.json();
}

/** Soft-deletes the account server-side; the caller signs out after. */
export async function deleteAccount(confirmationText: string): Promise<void> {
  await request('/users/me', {
    method: 'DELETE',
    body: JSON.stringify({ confirmation_text: confirmationText }),
  });
}

/** Ask the backend for a presigned PUT URL and the permanent photo_url to
    save once the upload lands. Auth-gated like every other /users call. */
export async function getSignedUploadUrl(
  body: SignedUrlRequest
): Promise<SignedUrlResponse> {
  const res = await request('/upload/signed-url', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Collections: life events, wishlists, wishes ────────────────────────────

/** A taxonomy tile the user tags a wishlist with (birthday, wedding, …).
    `icon` is an emoji from the seeded taxonomy (🎂 …); `id` also keys the
    pastel wash. */
export interface LifeEvent {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
}

/** A wishlist the user owns — the art block reads image_url first, else the
    life event's pastel. */
export interface Wishlist {
  id: string;
  name: string;
  image_url: string | null;
  // The backend always stores a value (defaulting "general") and never
  // returns null — so this is a plain string, not string | null.
  life_event_id: string;
  created_by: string;
  created_at: string;
}

/** One item inside a wishlist. `completed` drives the got-it visual state. */
export interface Wish {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  cost: number | null;
  link_url: string | null;
  image_url: string | null;
  completed: boolean;
  created_at: string;
}

/** POST /wishlists/ and PUT /wishlists/{id} body — the one form that calls
    both always sends name (validated non-empty) and adds the optional fields
    when set or changed */
export interface WishlistCreate {
  name: string;
  image_url?: string;
  life_event_id?: string;
}

/** POST /wishes/ body — wishlist_id and name required, the rest optional */
export interface WishCreate {
  wishlist_id: string;
  name: string;
  description?: string;
  cost?: number;
  link_url?: string;
  image_url?: string;
}

/** PUT /wishes/{id} body — send only what changed. An omitted field is left
    untouched; an explicit null clears description, cost, or link_url. */
export interface WishUpdate {
  name?: string;
  description?: string | null;
  cost?: number | null;
  link_url?: string | null;
  image_url?: string;
}

/** The life-event taxonomy, ordered by the backend's display_order. */
export async function fetchLifeEvents(): Promise<LifeEvent[]> {
  const res = await request('/life-events');
  return res.json();
}

/** Create a wishlist. The trailing slash is required — FastAPI's
    prefix-root route 307-redirects a slashless POST and drops the body. */
export async function createWishlist(body: WishlistCreate): Promise<Wishlist> {
  const res = await request('/wishlists/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

/** The signed-in user's wishlists, newest first (the backend sorts). */
export async function fetchMyWishlists(): Promise<Wishlist[]> {
  const res = await request('/wishlists/me');
  return res.json();
}

export async function fetchWishlist(id: string): Promise<Wishlist> {
  const res = await request(`/wishlists/${id}`);
  return res.json();
}

export async function updateWishlist(
  id: string,
  body: WishlistCreate
): Promise<Wishlist> {
  const res = await request(`/wishlists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteWishlist(id: string): Promise<void> {
  await request(`/wishlists/${id}`, { method: 'DELETE' });
}

/** A wishlist's wishes, in creation order (the backend sorts). */
export async function fetchWishes(wishlistId: string): Promise<Wish[]> {
  const res = await request(`/wishlists/${wishlistId}/wishes`);
  return res.json();
}

/** Create a wish. Trailing slash required for the same reason as wishlists. */
export async function createWish(body: WishCreate): Promise<Wish> {
  const res = await request('/wishes/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchWish(id: string): Promise<Wish> {
  const res = await request(`/wishes/${id}`);
  return res.json();
}

export async function updateWish(id: string, body: WishUpdate): Promise<Wish> {
  const res = await request(`/wishes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteWish(id: string): Promise<void> {
  await request(`/wishes/${id}`, { method: 'DELETE' });
}

/** Mark a wish got — returns the updated record with completed flipped. */
export async function completeWish(id: string): Promise<Wish> {
  const res = await request(`/wishes/${id}/complete`, { method: 'POST' });
  return res.json();
}

export async function uncompleteWish(id: string): Promise<Wish> {
  const res = await request(`/wishes/${id}/uncomplete`, { method: 'POST' });
  return res.json();
}

/** PUT the local file's raw bytes straight to S3 with its own presigned URL.
    This one bypasses `request()` on purpose: it targets S3, not our API, so
    it carries the image's Content-Type and NO Authorization header. */
export async function uploadToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string
): Promise<void> {
  const file = await fetch(fileUri);
  if (!file.ok) {
    throw new Error(`Could not read the selected image (${file.status})`);
  }
  const blob = await file.blob();
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }
}
