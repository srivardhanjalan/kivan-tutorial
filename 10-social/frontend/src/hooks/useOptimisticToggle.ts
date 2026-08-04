import { useState } from 'react';
import { useToast } from '../components/ToastProvider';

/**
 * The follow and love buttons share one dance: flip a boolean AND its count
 * instantly so the tap feels weightless, fire the matching request, and roll
 * BOTH back with a toast if it fails. This owns that optimistic-with-rollback
 * behavior so each button is just its own icon and label.
 *
 * Seeded once from `initialOn`/`initialCount`, so the caller mounts it only
 * after the value it reflects is known (a button rendered post-load). The
 * count is optional — the follow button toggles a bare boolean, the love
 * button a boolean with a tally.
 */
export default function useOptimisticToggle(options: {
  initialOn: boolean;
  initialCount?: number;
  turnOn: () => Promise<void>;
  turnOff: () => Promise<void>;
  errorMessage: string;
}) {
  const { initialOn, initialCount = 0, turnOn, turnOff, errorMessage } = options;
  const toast = useToast();
  const [on, setOn] = useState(initialOn);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    const next = !on;
    const step = next ? 1 : -1;
    setOn(next);
    setCount((c) => c + step);
    setLoading(true);
    try {
      await (next ? turnOn() : turnOff());
    } catch {
      // The request lost — undo the optimistic flip and say so
      setOn(!next);
      setCount((c) => c - step);
      toast.show(errorMessage, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return { on, count, loading, toggle };
}
