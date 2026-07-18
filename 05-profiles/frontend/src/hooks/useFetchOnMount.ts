import { useEffect, useState } from 'react';

/**
 * Fetch once on mount, ignore the result after unmount. Returns the resolved
 * value, a human-readable error, and whether the request is still in flight.
 */
export default function useFetchOnMount<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetcher()
      .then((value) => {
        if (mounted) {
          setData(value);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (mounted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
    // Intentionally mount-only: the fetcher identity may change per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, error, loading };
}
