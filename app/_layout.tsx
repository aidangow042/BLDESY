import { useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StripeProvider } from '@stripe/stripe-react-native';

import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CookieBanner } from '@/components/ui/cookie-banner';
import { OfflineBanner } from '@/components/offline-banner';
import { ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/lib/auth-context';
import { registerForPushNotifications, clearPushRegistration } from '@/lib/push';
import type { Session } from '@supabase/supabase-js';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const routingInProgress = useRef(false);
  const [fontsLoaded] = useFonts({
    RussoOne_400Regular,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) registerForPushNotifications(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') clearPushRegistration();
      else if (session?.user) registerForPushNotifications(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Still loading — don't redirect yet
    if (session === undefined) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Signed in but still on auth screen — route based on role.
      // Unified profile model: one account, additive roles. Check the
      // extension tables (builder_profiles, enterprise_profiles) first.
      // If neither exists, send to /welcome to pick.
      (async () => {
        if (routingInProgress.current) return;
        routingInProgress.current = true;

        try {
          const userId = session.user.id;
          const [{ data: builder }, { data: enterprise }] = await Promise.all([
            supabase.from('builder_profiles').select('approved').eq('user_id', userId).maybeSingle(),
            supabase.from('enterprise_profiles').select('status').eq('user_id', userId).maybeSingle(),
          ]);

          if (builder) {
            if ((builder as any)?.approved) router.replace('/(tabs)/portal' as any);
            else router.replace('/pending-approval' as any);
          } else if (enterprise) {
            const status = (enterprise as any).status;
            if (status === 'approved' || status === 'active') {
              router.replace('/enterprise-dashboard' as any);
            } else {
              router.replace('/pending-approval' as any);
            }
          } else {
            // No role yet — show the welcome picker. Customer role is
            // implicit so guests + welcome-skippers still land on (tabs).
            router.replace('/welcome' as any);
          }
        } finally {
          routingInProgress.current = false;
        }
      })();
    }
    // Guests are allowed to browse — no forced redirect to login
  }, [session, segments]);

  // Fix #3: Don't render anything while session is loading (prevents auth flash)
  if (session === undefined) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.bldesy.app"
        urlScheme="bldesy"
      >
      <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }}>
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="results" />
          <Stack.Screen name="post-job" />
          <Stack.Screen name="builder-profile" options={{ fullScreenGestureEnabled: false }} />
          <Stack.Screen name="builder-signup" />
          <Stack.Screen name="pending-approval" />
          <Stack.Screen name="builder-jobs" />
          <Stack.Screen name="job-detail" />
          <Stack.Screen name="builder-applications" />
          <Stack.Screen name="builder-analytics" />
          <Stack.Screen name="builder-edit-profile" options={{ fullScreenGestureEnabled: false }} />
          <Stack.Screen name="my-jobs" />
          <Stack.Screen name="all-trades" />
          <Stack.Screen name="enterprise-signup" />
          <Stack.Screen name="enterprise-dashboard" options={{ gestureEnabled: false }} />
          <Stack.Screen name="enterprise-jobs" />
          <Stack.Screen name="enterprise-edit-profile" options={{ fullScreenGestureEnabled: false }} />
          <Stack.Screen name="enterprise-analytics" />
          <Stack.Screen name="enterprise-billing" />
          <Stack.Screen name="enterprise-settings" />
          <Stack.Screen name="enterprise-job-detail" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="subscribe" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="billing" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="legal" />
          <Stack.Screen name="pricing" />
          <Stack.Screen name="for-builders" />
          <Stack.Screen name="for-tradies" />
          <Stack.Screen name="about" />
        </Stack>
        <OfflineBanner />
        <StatusBar style="auto" translucent />
        <CookieBanner />
      </ToastProvider>
      </ThemeProvider>
      </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
