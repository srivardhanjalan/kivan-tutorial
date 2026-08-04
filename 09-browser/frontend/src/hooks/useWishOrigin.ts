import useFetch from './useFetch';
import { fetchStorefronts, fetchBrands } from '../services/api';
import type { Wish } from '../services/api';

/** Where a wish came from, resolved to what its logo badge needs: the source's
    display name and logo URL. */
export interface WishOrigin {
  name: string;
  logoUrl: string | null;
}

/**
 * The app's one spelling of "where a wish came from" for its logo badge. A wish
 * carries at most one origin: a `storefront_id` when it was added from the
 * catalog, or a `brand_id` when it was captured in the in-app browser. This
 * fetches both reference lists and resolves either back to that source's name
 * and logo, so a sourced wish wears its origin's mark wherever it shows (the
 * wish tiles and the wish detail both read it); a hand-typed wish carries
 * neither and resolves to undefined, so no badge shows.
 */
export default function useWishOrigin() {
  const { data: storefronts } = useFetch(fetchStorefronts);
  const { data: brands } = useFetch(fetchBrands);

  const originFor = (wish: Wish): WishOrigin | undefined => {
    if (wish.storefront_id) {
      const store = storefronts?.find((s) => s.id === wish.storefront_id);
      if (store) return { name: store.name, logoUrl: store.logo_url };
    }
    if (wish.brand_id) {
      const brand = brands?.find((b) => b.id === wish.brand_id);
      if (brand) return { name: brand.name, logoUrl: brand.logo_url };
    }
    return undefined;
  };

  return { originFor };
}
