/**
 * /auth/callback — landing route for the OAuth redirect (`bldesy://auth/callback`).
 *
 * On iOS the auth session swallows the redirect and this screen never shows.
 * On Android the redirect also reaches expo-router as a deep link, so without a
 * route here the user would see "Unmatched route" while lib/auth/oauth.ts
 * finishes the token exchange. The screen does nothing but wait: once the
 * session lands it steps back to the auth screen that opened the browser and
 * the root layout's post-auth routing takes over from there. If nothing lands
 * it falls back to the login screen (copy from the website's app-bridge page).
 */
import { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';

/** How long to wait for the exchange before giving up. */
const GIVE_UP_MS = 8000;
/** Matches the website bridge's pause before it forwards to login. */
const FALLBACK_DELAY_MS = 1800;

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace(ROUTES.login);
}

export default function AuthCallbackScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { authedUser } = useUser();
  const [failed, setFailed] = useState(false);
  const left = useRef(false);

  // Session landed → hand back to the (auth) screen; the root layout routes.
  useEffect(() => {
    if (!authedUser || left.current) return;
    left.current = true;
    leave();
  }, [authedUser]);

  // Nothing landed → don't spin forever.
  useEffect(() => {
    if (authedUser) return;
    const timer = setTimeout(() => setFailed(true), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [authedUser]);

  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => {
      if (left.current) return;
      left.current = true;
      leave();
    }, FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  return (
    <View style={[styles.screen, { backgroundColor: c.canvas }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Card padding={Spacing['3xl']} style={styles.card}>
        {failed ? (
          <Text style={[styles.body, { color: c.textSecondary }]}>
            We couldn&apos;t sign you in automatically — taking you to the login page…
          </Text>
        ) : (
          <>
            <ActivityIndicator size="large" color={c.primary} style={styles.spinner} />
            <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
              Signing you in…
            </Text>
            <Text style={[styles.body, { color: c.textSecondary }]}>One sec — getting things ready.</Text>
          </>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
