import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { isAppleSignInAvailable, signInWithApple } from '@/lib/apple-auth';

interface Props {
  /** SIGN_IN (login) or SIGN_UP (signup) — Apple's HIG-styled label. */
  type?: 'signIn' | 'signUp';
  /** Surface a user-facing error (cancellations are ignored). */
  onError?: (message: string) => void;
  /** Called on a successful session (root layout usually handles routing). */
  onSuccess?: () => void;
}

/**
 * Native "Sign in with Apple" button. Renders only on iOS where the capability
 * is available (so it's a no-op in Expo Go / Android / web). Uses Apple's
 * official button styling, required by the Human Interface Guidelines.
 */
export function AppleSignInButton({ type = 'signIn', onError, onSuccess }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    isAppleSignInAvailable().then((v) => {
      if (active) setAvailable(v);
    });
    return () => {
      active = false;
    };
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        type === 'signUp'
          ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
          : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
      }
      buttonStyle={
        scheme === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={12}
      style={styles.button}
      onPress={async () => {
        const res = await signInWithApple();
        if (res.status === 'error') onError?.(res.message);
        else if (res.status === 'success') onSuccess?.();
        // 'cancelled' → no-op
      }}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    width: '100%',
  },
});
