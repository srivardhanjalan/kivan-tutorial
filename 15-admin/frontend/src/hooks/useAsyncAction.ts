import { useState } from 'react';
import { useToast } from '../components/ToastProvider';

/**
 * One spelling for "show the user why it failed": a Clerk error's specific
 * message when there is one, the caller's message otherwise. Raw thrown
 * messages (fetch paths, status codes) never reach a toast.
 */
function errorMessage(err: any, fallback: string): string {
  return err.errors?.[0]?.message || err.errors?.[0]?.longMessage || fallback;
}

/**
 * Runs an async action with the loading flag and toast-on-error every
 * mutating surface repeats: the auth screens, OAuth, and each Settings
 * save call `run(action, message)` and only spell their happy path.
 */
export default function useAsyncAction() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<void>, errorFallback: string) => {
    setLoading(true);
    try {
      await action();
    } catch (err: any) {
      if (err.code !== 'user_cancelled') {
        toast.show(errorMessage(err, errorFallback), { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, run };
}
