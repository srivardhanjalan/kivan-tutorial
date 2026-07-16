import { useState } from 'react';
import { useToast } from '../components/ToastProvider';

/**
 * One spelling for "show the user why Clerk said no": the specific error's
 * message, its long form, the thrown message, then the caller's fallback.
 */
function getClerkErrorMessage(err: any, fallback: string): string {
  return err.errors?.[0]?.message || err.errors?.[0]?.longMessage || err.message || fallback;
}

/**
 * Runs a Clerk action with the loading flag and toast-on-error every auth
 * surface repeats: sign-in, sign-up, verification and OAuth all call
 * `run(action, fallback)` and only spell their happy path.
 */
export default function useAuthAction() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<void>, errorFallback: string) => {
    setLoading(true);
    try {
      await action();
    } catch (err: any) {
      if (err.code !== 'user_cancelled') {
        toast.show(getClerkErrorMessage(err, errorFallback), { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, run };
}
