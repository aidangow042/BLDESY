import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one';
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
  const [fontsLoaded] = useFonts({ RussoOne_400Regular });

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

    if (!session && !inAuthGroup) {
      // Not signed in, send to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Signed in, send to app
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  // Fix #3: Don't render anything while session is loading (prevents auth flash)
  if (session === undefined) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="results" />
        <Stack.Screen name="post-job" />
        <Stack.Screen name="builder-profile" />
        <Stack.Screen name="builder-signup" />
        <Stack.Screen name="pending-approval" />
        <Stack.Screen name="builder-jobs" />
        <Stack.Screen name="job-detail" />
        <Stack.Screen name="builder-applications" />
        <Stack.Screen name="builder-edit-profile" />
        <Stack.Screen name="my-jobs" />
        <Stack.Screen name="all-trades" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="help" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" translucent />
    </ThemeProvider>
  );
}
