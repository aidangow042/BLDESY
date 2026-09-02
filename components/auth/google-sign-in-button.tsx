/**
 * "Google" button — mirrors the website's signup-form OAuth button
 * (`h-11 rounded-xl border border-border bg-surface text-sm font-semibold`,
 * Google "G" mark, `disabled:opacity-50`). Runs the browser auth session in
 * lib/auth/oauth.ts; routing afterwards belongs to the root layout.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signInWithGoogle, type OAuthResult } from '@/lib/auth/oauth';

interface Props {
  disabled?: boolean;
  /** Fires before the browser opens (e.g. to mark a fresh signup). */
  onStart?: () => void;
  onResult?: (result: OAuthResult) => void;
  style?: ViewStyle;
}

/** Google's four-colour "G" — the same paths the website renders. */
function GoogleMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export function GoogleSignInButton({ disabled = false, onStart, onResult, style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [busy, setBusy] = useState(false);
  const inactive = disabled || busy;

  async function press() {
    if (inactive) return;
    onStart?.();
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    onResult?.(result);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={press}
      style={({ pressed }) => [
        styles.button,
        { borderColor: c.border, backgroundColor: pressed ? c.canvas : c.surface },
        disabled && styles.disabled,
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={c.textSecondary} /> : <GoogleMark />}
      <Text style={[styles.label, { color: c.textPrimary }]}>Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
