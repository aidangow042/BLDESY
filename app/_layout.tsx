import { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CookieBanner } from '@/components/ui/cookie-banner';
import { OfflineBanner } from '@/components/offline-banner';
import { ToastProvider } from '@/components/ui';
import {
  AuthProvider,
  RolesProvider,
  ensureProfileRow,
  freshSignup,
  resolvePostAuthDest,
  useRoles,
  useUser,
} from '@/lib/auth-context';
import { registerForPushNotifications, clearPushRegistration, useNotificationTapRouting } from '@/lib/push';
import { useReferralCapture } from '@/lib/auth/referral-code';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

// Hold the native splash until fonts + the initial session are known, so the
// first frame never flashes unstyled text or the wrong auth state.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Post-auth side effects that need the identity providers: push-token
 * registration, the profiles-row upsert, and routing a user who just signed in
 * off the auth screens (mirrors the website's ensureProfileAndResolveDest).
 */
function PostAuthEffects() {
  const { authedUser, session } = useUser();
  const roles = useRoles();
  const segments = useSegments();
  const routingFor = useRef<string | null>(null);

  // bldesy://join?ref=… / https://www.bldesy.com.au/join?ref=… launch URLs → 30-day pending referral code.
  useReferralCapture();
  // Notification taps deep-link to the mirrored web route (data.route).
  useNotificationTapRouting();

  // Push registration follows the signed-in user; sign-out clears the cached token.
  useEffect(() => {
    if (authedUser) registerForPushNotifications(authedUser.id);
    else if (session === null) clearPushRegistration();
  }, [authedUser, session]);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!authedUser || !inAuthGroup || roles.loading) return;
    if (routingFor.current === authedUser.id) return;
    routingFor.current = authedUser.id;

    (async () => {
      await ensureProfileRow(authedUser);
      const fresh = freshSignup.pending;
      freshSignup.pending = false;
      router.replace(resolvePostAuthDest(roles, { freshSignup: fresh }) as Href);
    })();
  }, [authedUser, roles, segments]);

  useEffect(() => {
    if (!authedUser) routingFor.current = null;
  }, [authedUser]);

  return null;
}

function SplashGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session } = useUser();
  const ready = fontsLoaded && session !== undefined;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    RussoOne_400Regular,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.bldesy.app"
        urlScheme="bldesy"
      >
        <AuthProvider>
          <RolesProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <ToastProvider>
                <SplashGate fontsLoaded={fontsLoaded} />
                <PostAuthEffects />
                {/*
                  Routes are discovered from the app/ tree. Only screens that need
                  non-default navigator options are listed; new screens set their own
                  options inline with <Stack.Screen options={…} /> so parallel work on
                  different screens never has to touch this file.
                */}
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                  <Stack.Screen name="builder-profile" options={{ fullScreenGestureEnabled: false }} />
                </Stack>
                <OfflineBanner />
                <StatusBar style="auto" translucent />
                <CookieBanner />
              </ToastProvider>
            </ThemeProvider>
          </RolesProvider>
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
