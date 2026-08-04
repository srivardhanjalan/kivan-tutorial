import type { CurrencyCode } from '../constants/Currency';

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

/** One item inside a wishlist. `completed` drives the got-it visual state.
    A wish carries at most one origin the tiles badge with a logo: `storefront_id`
    on a wish added from the catalog, or `brand_id` on one captured in the in-app
    browser (useWishOrigin resolves either to that source's logo). `cost_currency`
    is the code a browser scrape captured (step 09); it is null on a manual or
    catalog wish, whose cost reads in the app default symbol. */
export interface Wish {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  cost: number | null;
  cost_currency: CurrencyCode | null;
  link_url: string | null;
  image_url: string | null;
  storefront_id: string | null;
  brand_id: string | null;
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

/** POST /wishes/ body — wishlist_id and name required, the rest optional.
    `storefront_id` rides along from the catalog add-flow and `brand_id` from the
    in-app browser, so a sourced wish records where it came from; `cost_currency`
    rides along when a browser scrape captured one. */
export interface WishCreate {
  wishlist_id: string;
  name: string;
  description?: string;
  cost?: number;
  cost_currency?: CurrencyCode | null;
  link_url?: string;
  image_url?: string;
  storefront_id?: string;
  brand_id?: string;
}

/** PUT /wishes/{id} body. Send only what changed; an omitted field is left
    untouched, while an explicit null clears description, cost, or link_url. */
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

/** Every wish across all the caller's wishlists. The catalog's duplicate guard
    reads this to tell whether a product is already saved (matched on link_url),
    which the per-wishlist listing can't answer on its own. */
export async function fetchMyWishes(): Promise<Wish[]> {
  const res = await request('/wishes/mine');
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

// ── Storefronts: the curated catalog wishes can be added from ───────────────

/** A curated store in the catalog. `product_count` is the denormalized count
    the store card shows; `logo_url` is the store's mark, rendered in the store
    directory in place of a glyph (the seed points it at a committed placeholder;
    admin logo uploads arrive in step 15). */
export interface Storefront {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  product_count: number;
}

/** One product in a storefront. `price` is in the app's single currency
    (formatCost renders it); adding the product to a wishlist carries name,
    price, link_url, and image_url straight onto a new wish (each field named to
    match the wish's own). `image_url` is the product photo the tile and detail
    hero render (the seed points it at a committed placeholder; a placeholder
    glyph still stands in when it is null). `category` groups the store's
    products so the store screen can filter by it. `storefront_id` is stamped
    onto the wish so it can be badged with the store's logo. */
export interface Product {
  id: string;
  storefront_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  link_url: string;
}

/** The curated catalog of stores, ordered by the backend's display_order. */
export async function fetchStorefronts(): Promise<Storefront[]> {
  const res = await request('/storefronts');
  return res.json();
}

/** A storefront's products, in display order (the backend sorts). */
export async function fetchStorefrontProducts(
  storefrontId: string
): Promise<Product[]> {
  const res = await request(`/storefronts/${storefrontId}/products`);
  return res.json();
}

// ── Brands: the real-store directory + the scrape proxy ─────────────────────

/** A real store in the browse-and-capture directory. The in-app browser opens
    `website_url`; `country` is a display hint and signals the currency a scrape
    from that store is likely to quote. `logo_url` is the brand's mark, rendered
    in the directory row and (via useWishOrigin) as the badge on a wish captured
    while browsing that brand; the seed uploads each placeholder logo to the
    private photos bucket and the backend re-signs it on read, exactly like a
    storefront's logo. */
export interface Brand {
  id: string;
  name: string;
  description: string | null;
  website_url: string;
  category: string;
  country: string;
  logo_url: string | null;
}

/** The real-store directory, ordered by the backend's (display_order, name)
    and grouped by category on the client. (display_order sorts server-side, so
    like a storefront the type does not carry it.) */
export async function fetchBrands(): Promise<Brand[]> {
  const res = await request('/brands');
  return res.json();
}

/** Scrape a browsed product page through the backend's Firecrawl proxy (the
    API key stays server-side). Returns Firecrawl's {success, data} envelope
    untouched; the scrapers module owns extracting title/price/image from
    `data`. A failed scrape resolves with success:false, not a throw. */
export async function scrapeUrl(
  url: string
): Promise<{ success: boolean; data?: any }> {
  const res = await request('/scrape/firecrawl', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
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
