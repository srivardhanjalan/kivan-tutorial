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

/** A user's public profile: the record plus denormalized social counts and,
    for the viewer, whether they follow this user (null when it's your own
    profile). Returned by GET /users/{id} and the popular rail. */
export interface UserWithCounts extends User {
  follower_count: number;
  following_count: number;
  is_following: boolean | null;
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
  | 'wish_photo'
  | 'event_photo';

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
/** A wishlist's visibility (step 14): `public` shows to anyone, `private` only
    to its owners and co-owners. Two values, not three: the backend's
    documented-but-dead "shared" tier was dropped, so the type can't express a
    value nothing enforces. */
export type PrivacyType = 'public' | 'private';

export interface Wishlist {
  id: string;
  name: string;
  image_url: string | null;
  // The backend always stores a value (defaulting "general") and never
  // returns null — so this is a plain string, not string | null.
  life_event_id: string;
  created_by: string;
  created_at: string;
  /** Denormalized love tally (step 10): how many users have loved it. */
  love_count: number;
  /** Who can see it (step 14). A record stored before privacy existed reads
      back "public", the visibility every wishlist had then. */
  privacy_type: PrivacyType;
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
  /** Visibility (step 14); omitted on create the backend defaults it public. */
  privacy_type?: PrivacyType;
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

/** A wishlist's owners: the creator and every co-owner, as full User records
    (step 14). View-gated on the backend, so any viewer who can see the wishlist
    can see who owns it. */
export async function fetchWishlistOwners(wishlistId: string): Promise<User[]> {
  const res = await request(`/wishlists/${wishlistId}/owners`);
  return res.json();
}

/** Promote a user to co-owner of a wishlist (owner-only). The added user
    becomes a full owner immediately, with no invite/accept step. */
export async function addWishlistOwner(
  wishlistId: string,
  userId: string
): Promise<void> {
  await request(`/wishlists/${wishlistId}/owners`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

/** Remove a co-owner (owner-only). The backend refuses to remove the last
    owner: a wishlist always keeps at least one. */
export async function removeWishlistOwner(
  wishlistId: string,
  ownerId: string
): Promise<void> {
  await request(`/wishlists/${wishlistId}/owners/${encodeURIComponent(ownerId)}`, {
    method: 'DELETE',
  });
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

// ── Social: users, the follow graph, and loves ─────────────────────────────

/** Typeahead user search by name. The caller owns the empty-box rule (it shows
    the popular rail and never calls this with a blank query), so this just asks. */
export async function searchUsers(query: string): Promise<User[]> {
  const res = await request(`/users/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

/** Discover's default rail: the most-followed users. */
export async function fetchPopularUsers(): Promise<UserWithCounts[]> {
  const res = await request('/users/popular');
  return res.json();
}

/** Discover's "wishlists to love" rail: the most-loved wishlists. */
export async function fetchPopularWishlists(): Promise<Wishlist[]> {
  const res = await request('/wishlists/popular');
  return res.json();
}

/** A user's public profile: counts, and whether you follow them. */
export async function fetchUser(userId: string): Promise<UserWithCounts> {
  const res = await request(`/users/${userId}`);
  return res.json();
}

/** A user's wishlists, newest first (the backend sorts). */
export async function fetchUserWishlists(userId: string): Promise<Wishlist[]> {
  const res = await request(`/users/${userId}/wishlists`);
  return res.json();
}

/** The wishlists a user has loved. */
export async function fetchUserLovedWishlists(userId: string): Promise<Wishlist[]> {
  const res = await request(`/users/${userId}/loved-wishlists`);
  return res.json();
}

/** The users following a user. */
export async function fetchFollowers(userId: string): Promise<User[]> {
  const res = await request(`/users/${userId}/followers`);
  return res.json();
}

/** The users a user follows. */
export async function fetchFollowing(userId: string): Promise<User[]> {
  const res = await request(`/users/${userId}/following`);
  return res.json();
}

/** Follow a user. Idempotent server-side: a repeat is a no-op. */
export async function followUser(userId: string): Promise<void> {
  await request(`/users/${userId}/follow`, { method: 'POST' });
}

/** Unfollow a user. Idempotent server-side. */
export async function unfollowUser(userId: string): Promise<void> {
  await request(`/users/${userId}/unfollow`, { method: 'DELETE' });
}

/** Whether the current user loves a wishlist (the per-viewer bit). */
export async function fetchLoveStatus(wishlistId: string): Promise<boolean> {
  const res = await request(`/wishlists/${wishlistId}/love/status`);
  const data = await res.json();
  return data.is_loved;
}

/** Love a wishlist. Idempotent server-side. */
export async function loveWishlist(wishlistId: string): Promise<void> {
  await request(`/wishlists/${wishlistId}/love`, { method: 'POST' });
}

/** Unlove a wishlist. Idempotent server-side. */
export async function unloveWishlist(wishlistId: string): Promise<void> {
  await request(`/wishlists/${wishlistId}/love`, { method: 'DELETE' });
}

// ── Notifications: the feed, the unread badge, and mute settings ────────────

/** The six notification types this app raises. Each maps to an icon and an
    accent color in the feed, and to a mute flag in settings. */
export type NotificationType =
  | 'follow'
  | 'wishlist_created'
  | 'wish_added'
  | 'wishlist_loved'
  | 'event_created'
  | 'event_invitation';

/** The user who triggered a notification, as a feed row renders them: a lighter
    projection than the full User, an avatar and a name and nothing else.
    Read only through NotificationWithActor.actor, so it stays module-private. */
interface NotificationActor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

/** The thing a notification points at: the id the tap navigates to, plus
    `wishlist_id` riding along on a wish so the tap can open it inside its
    parent list. Null when the resource was deleted after the notification
    fired (the backend drops the link).
    Read only through NotificationWithActor.resource, so it stays module-private. */
interface NotificationResource {
  id: string;
  wishlist_id?: string;
}

/** One notification enriched for the feed: the row plus its resolved actor and
    (when it references one) a small resource summary. */
export interface NotificationWithActor {
  id: string;
  actor: NotificationActor;
  notification_type: NotificationType;
  message: string;
  resource: NotificationResource | null;
  read: boolean;
  created_at: string;
}

/** GET /notifications/me: one page, plus counts over the FULL set (so the
    unread pill renders without a second call) and the cursor for the next page. */
export interface NotificationsResponse {
  notifications: NotificationWithActor[];
  total: number;
  unread_count: number;
  has_more: boolean;
  next_offset: number | null;
}

/** A user's notification preferences: the per-type mute flags (every one
    defaults false, nothing muted; singular names like `mute_follow` match the
    consumer's `mute_{type}` derivation exactly, so a muted type is actually
    honored) plus `email_notifications`, whether email copies are sent (defaults
    true, opt-out). */
export interface NotificationSettings {
  user_id: string;
  mute_follow: boolean;
  mute_wishlist_created: boolean;
  mute_wish_added: boolean;
  mute_wishlist_loved: boolean;
  mute_event_created: boolean;
  mute_event_invitation: boolean;
  email_notifications: boolean;
  updated_at: string;
}

/** PUT /notifications/settings body: send only the fields that changed. */
export interface NotificationSettingsUpdate {
  mute_follow?: boolean;
  mute_wishlist_created?: boolean;
  mute_wish_added?: boolean;
  mute_wishlist_loved?: boolean;
  mute_event_created?: boolean;
  mute_event_invitation?: boolean;
  email_notifications?: boolean;
}

/** One page of the caller's notifications, newest first; the counts in the
    response cover the full set. */
export async function fetchNotifications(
  limit: number,
  offset: number
): Promise<NotificationsResponse> {
  const res = await request(`/notifications/me?limit=${limit}&offset=${offset}`);
  return res.json();
}

/** The unread count behind the tab badge. Best-effort server-side (a transient
    read error returns 0, never a 500), so the badge polls it without erroring. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await request('/notifications/unread-count');
  const data = await res.json();
  return data.unread_count;
}

/** Mark one notification read. */
export async function markNotificationRead(id: string): Promise<void> {
  await request(`/notifications/${id}/read`, { method: 'PUT' });
}

/** Mark every unread notification read: the "clear the badge" action. */
export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', { method: 'PUT' });
}

/** Delete one notification. */
export async function deleteNotification(id: string): Promise<void> {
  await request(`/notifications/${id}`, { method: 'DELETE' });
}

/** The caller's notification preferences (defaults to nothing muted and email
    copies on for a new user). */
export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const res = await request('/notifications/settings');
  return res.json();
}

/** Toggle any subset of the settings fields; returns the updated settings. */
export async function updateNotificationSettings(
  update: NotificationSettingsUpdate
): Promise<NotificationSettings> {
  const res = await request('/notifications/settings', {
    method: 'PUT',
    body: JSON.stringify(update),
  });
  return res.json();
}

// ── Events (step 13) ───────────────────────────────────────────────────────

/** An event the user hosts or is invited to. `event_type` is a life-event id
    (it keys the same pastel wash a wishlist's does); `event_date` is an ISO
    string, `image_url` the single cover (re-signed on read). */
export interface Event {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** An invitee's RSVP. "pending" is the server's initial state (never something
    the invitee sets); the three the invitee can choose are the rest. */
export type RsvpStatus = 'pending' | 'going' | 'maybe' | 'not_going';

/** The three RSVP states an invitee can actually set (PATCH rejects "pending"). */
export type RsvpChoice = Exclude<RsvpStatus, 'pending'>;

/** One invitee of an event, enriched with the invited person's record when the
    invite was addressed to a user. `invitee_id` is the identifier the RSVP and
    remove calls key on: a user id for a "user" invite, the raw email for an
    "email" invite (`user` is null until that address has an account). */
export interface EventInvitee {
  event_id: string;
  invitee_id: string;
  invitee_type: 'user' | 'email';
  rsvp_status: RsvpStatus;
  invited_at: string;
  invited_by: string;
  user: User | null;
}

/** POST /events/ and PUT /events/{id} body: the one form that calls both
    always sends name and adds the optional fields when set or changed. */
export interface EventCreate {
  name: string;
  description?: string;
  image_url?: string;
  is_public?: boolean;
  event_type?: string;
  event_date?: string;
  location?: string;
}

/** An event I'm invited to, carrying my own RSVP status (an event I host has
    no RSVP, so hosting stays plain `Event`). Consumed only through `MyEvents`,
    so it isn't exported. */
interface EventInvited extends Event {
  my_rsvp_status: RsvpStatus | null;
}

/** GET /events/me: the events I host and the events I'm invited to; the invited
    ones carry my RSVP so My Stuff can show its state at a glance. */
export interface MyEvents {
  hosting: Event[];
  invited: EventInvited[];
}

/** GET /events/{id}: the event with its hosts, invitees (user-enriched for the
    Guests list), and linked wishlists, plus how I relate to it: is_host unlocks
    edit/delete/invite, is_invitee/my_rsvp_status drive the RSVP control. */
export interface EventDetail {
  event: Event;
  hosts: User[];
  invitees: EventInvitee[];
  wishlists: Wishlist[];
  is_host: boolean;
  is_invitee: boolean;
  my_rsvp_status: RsvpStatus | null;
}

/** Create an event; the creator becomes its first host server-side. The
    trailing slash is required (see createWishlist). */
export async function createEvent(body: EventCreate): Promise<Event> {
  const res = await request('/events/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

/** The events I host and am invited to. */
export async function fetchMyEvents(): Promise<MyEvents> {
  const res = await request('/events/me');
  return res.json();
}

/** One event's full detail (hosts, linked wishlists, is_host). */
export async function fetchEvent(id: string): Promise<EventDetail> {
  const res = await request(`/events/${id}`);
  return res.json();
}

export async function updateEvent(id: string, body: EventCreate): Promise<Event> {
  const res = await request(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
  await request(`/events/${id}`, { method: 'DELETE' });
}

/** Link a wishlist the caller owns to an event they host. */
export async function linkWishlistToEvent(
  eventId: string,
  wishlistId: string
): Promise<void> {
  await request(`/events/${eventId}/wishlists`, {
    method: 'POST',
    body: JSON.stringify({ wishlist_id: wishlistId }),
  });
}

/** Invite one person to an event (host-only): a known user by id, or anyone by
    email. The backend takes parallel id/email lists, so this wraps the single
    invite as the one-element list its kind belongs in. */
export async function addEventInvitee(
  eventId: string,
  invitee: { user_id: string } | { email: string }
): Promise<void> {
  const body =
    'user_id' in invitee
      ? { invitee_ids: [invitee.user_id] }
      : { invitee_emails: [invitee.email] };
  await request(`/events/${eventId}/invitees`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Remove an invitee (host-only). `inviteeId` is the user id or the email that
    keys the row (an invitee's `invitee_id`). */
export async function removeEventInvitee(
  eventId: string,
  inviteeId: string
): Promise<void> {
  await request(`/events/${eventId}/invitees/${encodeURIComponent(inviteeId)}`, {
    method: 'DELETE',
  });
}

/** Set my RSVP. Only the invitee themselves may call this for their own row;
    `inviteeId` is my user id, or my email for an invite addressed to it. */
export async function updateRSVP(
  eventId: string,
  inviteeId: string,
  status: RsvpChoice
): Promise<void> {
  await request(`/events/${eventId}/invitees/${encodeURIComponent(inviteeId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ rsvp_status: status }),
  });
}
