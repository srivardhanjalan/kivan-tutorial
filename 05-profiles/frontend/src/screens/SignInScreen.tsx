import React from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import AuthFormLayout from '../components/layouts/AuthFormLayout';
import AuthMethods from '../components/AuthMethods';
import { useToast } from '../components/ToastProvider';
import useAsyncAction from '../hooks/useAsyncAction';

export default function SignInScreen({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const toast = useToast();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { loading, run } = useAsyncAction();

  const onSignIn = (email: string, password: string) => {
    if (!isLoaded) return;
    run(async () => {
      const completeSignIn = await signIn.create({ identifier: email, password });

      if (completeSignIn.status === 'complete') {
        // setActive flips useAuth().isSignedIn — Navigation swaps to the app
        await setActive({ session: completeSignIn.createdSessionId });
      } else {
        toast.show('Sign-in incomplete. Please try again.', { type: 'error' });
      }
    }, 'Sign in failed');
  };

  return (
    <AuthFormLayout title="Welcome to Kivan" subtitle="Sign in to continue">
      <AuthMethods
        ctaLabel="Sign In"
        loading={loading}
        onSubmit={onSignIn}
        passwordContentType="password"
        switchPrompt="Don't have an account?"
        switchLinkLabel="Sign Up"
        onSwitch={onSwitchToSignUp}
      />
    </AuthFormLayout>
  );
}
