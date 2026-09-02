import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { isAppleSignInAvailable, signInWithApple, type AppleSignInResult } from '@/lib/apple-auth';

interface Props {
  /** SIGN_IN (login) or SIGN_UP (signup) — Apple's HIG-styled label. */
  type?: 'signIn' | 'signUp';
  /** Greyed out and inert — the signup form uses this until terms are ticked. */
  disabled?: boolean;
  /** Fires before the native sheet opens (e.g. to mark a fresh signup). */
  onStart?: () => void;
  /** Outcome of the attempt; routing on success belongs to the root layout. */
  onResult?: (result: AppleSignInResult) => void;
  style?: ViewStyle;
}

/**
 * Native "Sign in with Apple" button. Renders only on iOS where the capability
 * is available (so it's a no-op in Expo Go / Android / web). Uses Apple's
 * official button styling, required by the Human Interface Guidelines.
 */
export function AppleSignInButton({ type = 'signIn', disabled = false, onStart, onResult, style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const inactive = disabled || busy;

  return (
    <View
      accessibilityState={{ disabled: inactive, busy }}
      style={[style, inactive && styles.inactive, disabled && styles.disabled]}
    >
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
          if (inactive) return;
          onStart?.();
          setBusy(true);
          const result = await signInWithApple();
          setBusy(false);
          onResult?.(result);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    width: '100%',
  },
  inactive: {
    pointerEvents: 'none',
  },
  disabled: {
    opacity: 0.5,
  },
});
