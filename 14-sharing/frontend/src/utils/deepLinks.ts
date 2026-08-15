import * as Linking from 'expo-linking';
import AppConfig from '../config/app';

/** The prefix every Kivan deep link carries, e.g. `kivan://`. Built from the
    one scheme in AppConfig so the links the share modals mint and the links
    this parser matches can never drift apart. */
export const DEEP_LINK_PREFIX = `${AppConfig.scheme}://`;

/**
 * A resolved deep link: which screen it opens and the params to open it with.
 * Exactly the three shareable entities (a wishlist, a profile, an event), each
 * keyed by the same param its screen already takes, so navigation is a direct
 * hand-off. (Wishes and storefronts are deliberately not shareable.)
 */
export type DeepLinkTarget =
  | { screen: 'WishlistDetail'; params: { wishlistId: string } }
  | { screen: 'UserProfile'; params: { userId: string } }
  | { screen: 'EventDetail'; params: { eventId: string } };

/**
 * Turn a `kivan://…` URL into the screen it should open, or null if it's not a
 * link we route. Pure given the URL string: the whole of deep linking's logic
 * lives here so both the cold-start and warm handlers in Navigation share one
 * parser, and so it can be reasoned about (and E2E-checked) on its own.
 *
 * `expo-linking`'s parse splits `kivan://wishlist/<id>` into hostname
 * `"wishlist"` and path `"<id>"`, so the path is the id for the matching kind.
 * The kinds are checked in a fixed order and the first match wins.
 */
export function parseDeepLink(url: string): DeepLinkTarget | null {
  const { path, hostname } = Linking.parse(url);

  const wishlistId = idFor('wishlist', hostname, path);
  if (wishlistId) return { screen: 'WishlistDetail', params: { wishlistId } };

  const userId = idFor('user', hostname, path);
  if (userId) return { screen: 'UserProfile', params: { userId } };

  const eventId = idFor('event', hostname, path);
  if (eventId) return { screen: 'EventDetail', params: { eventId } };

  return null;
}

/** The id a link carries: `kivan://<kind>/<id>` parses to hostname `<kind>` and
    path `<id>`, so the path IS the id for the matching kind. Null when this link
    is a different kind. The id is left loose on purpose: the screen the link
    opens is what truly validates it, by fetching it. */
function idFor(kind: string, hostname: string | null, path: string | null): string | null {
  return hostname === kind && path ? path : null;
}
