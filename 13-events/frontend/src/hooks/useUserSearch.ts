import { useCallback, useEffect, useState } from 'react';
import { searchUsers } from '../services/api';
import type { User } from '../services/api';

/** One request per pause, not per keystroke: the people-search cadence shared by
    Discover and the invite modal. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounced people search: a trimmed query fires one `searchUsers` request after
 * the pause; an empty box clears the results. An optional `filter` narrows the
 * hits (the invite modal drops anyone already invited and the host themselves),
 * and `reset` clears the box (the modal calls it on open).
 */
export default function useUserSearch(filter?: (user: User) => boolean) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(trimmed)
        .then((users) => setResults(filter ? users.filter(filter) : users))
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // A search keys on `query` alone: the filter snapshots the invitee set at the
    // moment the query changed, matching the behavior before this hook existed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery, results, reset };
}
