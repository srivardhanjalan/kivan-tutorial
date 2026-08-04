import useFetch from './useFetch';
import { fetchStorefronts } from '../services/api';
import type { Storefront } from '../services/api';

/**
 * The app's one spelling of "resolve a wish's store for its logo badge": it
 * fetches the storefront catalog and maps a wish's storefront_id back to its
 * store. The wish tiles (the grid) and the wish detail both read it, so a wish
 * added from the catalog can wear its store's logo wherever it shows.
 */
export default function useStorefronts() {
  const { data: storefronts } = useFetch(fetchStorefronts);
  const storefrontFor = (id: string | null): Storefront | undefined =>
    id ? storefronts?.find((store) => store.id === id) : undefined;
  return { storefrontFor };
}
