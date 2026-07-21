import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Fetch once on mount — or on every screen focus with `refetchOnFocus`
 * (screens whose data other screens can change, like Home after Settings
 * edits a profile). Ignores results after unmount; exposes the value, a
 * human-readable error, and whether a request is in flight.
 */
export default function useFetch<T>(
  fetcher: () => Promise<T>,
  options?: { refetchOnFocus?: boolean }
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const run = useCallback(() => {
    let live = true;
    fetcher()
      .then((value) => {
        if (live) {
          setData(value);
          setError('');
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (live) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
    // Intentionally not keyed on fetcher: its identity may change per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetchOnFocus = options?.refetchOnFocus ?? false;

  // Exactly one of these effects is live for a given caller
  useEffect(() => {
    if (refetchOnFocus) return;
    return run();
  }, [refetchOnFocus, run]);

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      return run();
    }, [refetchOnFocus, run])
  );

  return { data, error, loading };
}
