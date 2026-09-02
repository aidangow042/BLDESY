/**
 * SocialAuthRow — Google + Apple side by side, mirroring the website's
 * signup-form OAuth row (`flex gap-3`, each button `flex-1 h-11`). Apple
 * renders only on iOS where it is available; Google then fills the row.
 * Both report through one `onResult` so screens handle outcomes in one place.
 */
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { OAuthResult } from '@/lib/auth/oauth';

import { AppleSignInButton } from './apple-sign-in-button';
import { GoogleSignInButton } from './google-sign-in-button';

/** Shared shape of the Apple and Google outcomes. */
export type SocialAuthResult = OAuthResult;

interface Props {
  mode: 'signIn' | 'signUp';
  /** Inert + faded until the caller's precondition (terms) is met. */
  disabled?: boolean;
  onStart?: () => void;
  onResult?: (result: SocialAuthResult) => void;
}

export function SocialAuthRow({ mode, disabled = false, onStart, onResult }: Props) {
  return (
    <View style={styles.row}>
      <GoogleSignInButton style={styles.item} disabled={disabled} onStart={onStart} onResult={onResult} />
      <AppleSignInButton type={mode} style={styles.item} disabled={disabled} onStart={onStart} onResult={onResult} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  item: {
    flex: 1,
  },
});
