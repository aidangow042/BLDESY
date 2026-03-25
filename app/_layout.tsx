import { useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Session } from '@supabase/supabase-js';

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
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Still loading — don't redirect yet
    if (session === undefined) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Signed in but still on auth screen — route based on role
      (async () => {
        if (routingInProgress.current) return;
        routingInProgress.current = true;

        try {
          // Read role from profiles table (server-side, RLS-protected) — not user_metadata which is client-writable
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          const role = profile?.role ?? 'customer';

          if (role === 'builder') {
            const { data } = await supabase
              .from('builder_profiles')
              .select('approved')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if ((data as any)?.approved) {
              router.replace('/(tabs)/portal' as any);
            } else if (data) {
              router.replace('/pending-approval' as any);
            } else {
              router.replace('/builder-signup' as any);
            }
          } else {
            // Customer or no role set — default to home
            router.replace('/(tabs)');
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
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }}>
          <Stack.Screen name="(tabs)" />
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
          <Stack.Screen name="billing" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="legal" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" translucent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
