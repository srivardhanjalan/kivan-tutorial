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

/** Ids as they appear in a link: wishlist and event ids are uuids, a profile id
    is a Clerk user id (letters, digits, `_` and `-`). Kept loose on purpose:
    the screen the link opens is what truly validates the id by fetching it. */
const UUID = '[a-f0-9-]+';
const CLERK_ID = '[a-zA-Z0-9_-]+';

/**
 * Turn a `kivan://…` URL into the screen it should open, or null if it's not a
 * link we route. Pure given the URL string: the whole of deep linking's logic
 * lives here so both the cold-start and warm handlers in Navigation share one
 * parser, and so it can be reasoned about (and E2E-checked) on its own.
 *
 * `expo-linking`'s parse splits `kivan://wishlist/<id>` into hostname
 * `"wishlist"` and path `"<id>"`; a link that arrives with the kind in the path
 * instead (`.../go/wishlist/<id>`) is caught by the regex fallback. The kinds
 * are checked in a fixed order and the first match wins.
 */
export function parseDeepLink(url: string): DeepLinkTarget | null {
  const { path, hostname } = Linking.parse(url);

  const wishlistId = idFor('wishlist', UUID, hostname, path);
  if (wishlistId) return { screen: 'WishlistDetail', params: { wishlistId } };

  const userId = idFor('user', CLERK_ID, hostname, path);
  if (userId) return { screen: 'UserProfile', params: { userId } };

  const eventId = idFor('event', UUID, hostname, path);
  if (eventId) return { screen: 'EventDetail', params: { eventId } };

  return null;
}

/** Pull an entity id out of a parsed link: the path IS the id when the kind rode
    in as the hostname (`kivan://<kind>/<id>`), otherwise a `<kind>/<id>` run
    anywhere in the path. Returns null when this kind isn't present. */
function idFor(
  kind: string,
  idPattern: string,
  hostname: string | null,
  path: string | null
): string | null {
  if (hostname === kind && path) {
    return path;
  }
  if (path) {
    const match = path.match(new RegExp(`${kind}/(${idPattern})`, 'i'));
    if (match) return match[1];
  }
  return null;
}
