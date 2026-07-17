import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-expo';
import AuthFormLayout from '../components/layouts/AuthFormLayout';
import AuthMethods from '../components/AuthMethods';
import AuthTextInput from '../components/AuthTextInput';
import PrimaryButton from '../components/PrimaryButton';
import useAuthAction from '../hooks/useAuthAction';

export default function SignUpScreen({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { loading, run } = useAuthAction();

  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const onSignUp = (email: string, password: string) => {
    if (!isLoaded) return;
    run(async () => {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    }, 'Sign up failed');
  };

  const onVerify = () => {
    if (!isLoaded) return;
    run(async () => {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      // No backend sync call after this: the backend provisions the user
      // record automatically on the first authenticated request.
      await setActive({ session: completeSignUp.createdSessionId });
    }, 'Verification failed');
  };

  if (pendingVerification) {
    return (
      <AuthFormLayout
        title="Verify Email"
        subtitle={`We sent a verification code to ${signUp?.emailAddress ?? 'your email'}`}
      >
        <AuthTextInput
          value={code}
          placeholder="Verification Code"
          onChangeText={setCode}
          keyboardType="number-pad"
        />
        <PrimaryButton title="Verify Email" onPress={onVerify} loading={loading} />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout title="Create Account" subtitle="Sign up to get started">
      <AuthMethods
        ctaLabel="Sign Up"
        loading={loading}
        onSubmit={onSignUp}
        passwordContentType="newPassword"
        switchPrompt="Already have an account?"
        switchLinkLabel="Sign In"
        onSwitch={onSwitchToSignIn}
      />
    </AuthFormLayout>
  );
}
