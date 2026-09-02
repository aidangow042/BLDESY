/**
 * /join?ref=BLD-XXXXX — referral landing, the app twin of the website's
 * app/join/route.ts: remember the mate's code for 30 days, then send a
 * signed-in user straight into the tradie wizard (on the web, via the
 * app-bridge with `next=join?ref=…`) and a guest to sign-up first.
 */
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { savePendingReferralCode } from '@/lib/auth/referral-code';
import { useUser } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function JoinScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string | string[] }>();
  const { authedUser, loading } = useUser();
  const handled = useRef(false);
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (loading || handled.current) return;
    handled.current = true;
    (async () => {
      const raw = Array.isArray(ref) ? ref[0] : ref;
      await savePendingReferralCode(raw);
      if (authedUser) {
        router.replace(ROUTES.home as Href);
        await openWebOnboarding('builder');
      } else {
        router.replace(ROUTES.signup as Href);
      }
    })();
  }, [ref, authedUser, loading]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.canvas }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}
