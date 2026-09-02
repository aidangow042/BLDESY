/**
 * Push notification registration and listeners. Uses the website's
 * `/api/push/register` to bind the Expo push token to the user.
 *
 * Expo push only works on physical devices. Simulator returns
 * { granted: false } or an Android-emulator placeholder — both no-op.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { router, type Href } from 'expo-router';
import { api, ApiError } from './api';
import { webRouteToAppHref } from './data/push-routes';

const PUSH_TOKEN_KEY = 'bldesy_push_token';
const PUSH_USER_KEY = 'bldesy_push_user';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface RegisterResult {
  status: 'registered' | 'denied' | 'unsupported' | 'cached' | 'error';
  token?: string;
}

/**
 * Register the device for push.
 *
 * `prompt` controls whether we may show the iOS permission dialog:
 *   - false (default): SILENT. Used on app launch / sign-in — we only refresh
 *     the token if permission was already granted, and never prompt. Apple +
 *     our own guidelines require permission requests at point of use, not on
 *     launch.
 *   - true: explicit user opt-in (e.g. the Settings "Push notifications"
 *     toggle) — shows the system permission dialog if not yet decided.
 */
export async function registerForPushNotifications(
  userId: string,
  opts: { prompt?: boolean } = {},
): Promise<RegisterResult> {
  if (!Device.isDevice) return { status: 'unsupported' };

  const { status: existing } = await Notifications.getPermissionsAsync();
  let permission = existing;
  if (permission !== 'granted') {
    // Don't prompt on launch — only when the user explicitly opts in.
    if (!opts.prompt) return { status: 'denied' };
    const { status } = await Notifications.requestPermissionsAsync();
    permission = status;
  }
  if (permission !== 'granted') return { status: 'denied' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
    });
  }

  // Re-use cached token if it's already bound to this user.
  const cachedToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  const cachedUser = await SecureStore.getItemAsync(PUSH_USER_KEY);
  if (cachedToken && cachedUser === userId) {
    return { status: 'cached', token: cachedToken };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await api.post('/api/push/register', {
      token,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? null,
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(PUSH_USER_KEY, userId);
    return { status: 'registered', token };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('push registration failed:', e instanceof ApiError ? e.message : e);
    return { status: 'error' };
  }
}

export async function clearPushRegistration() {
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(PUSH_USER_KEY);
}

/**
 * Route a notification tap. The website's dispatcher puts a WEB path in
 * `data.route` (e.g. /portal/billing, /messages?c=…, /jobs/{id}); app routes
 * mirror those paths, and webRouteToAppHref() allowlists + maps them.
 * Mount once, inside the navigation providers (root layout).
 */
export function useNotificationTapRouting() {
  const handled = useRef<string | null>(null);

  useEffect(() => {
    function open(response: Notifications.NotificationResponse | null) {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      const data = response.notification.request.content.data as { route?: unknown } | undefined;
      const route = typeof data?.route === 'string' ? data.route : undefined;
      router.push(webRouteToAppHref(route) as Href);
    }

    // Cold start from a tap: the response that launched the app.
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
