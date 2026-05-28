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
import { api, ApiError } from './api';

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

export async function registerForPushNotifications(userId: string): Promise<RegisterResult> {
  if (!Device.isDevice) return { status: 'unsupported' };

  const { status: existing } = await Notifications.getPermissionsAsync();
  let permission = existing;
  if (permission !== 'granted') {
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
