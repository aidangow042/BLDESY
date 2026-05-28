/**
 * Notification bell — header icon with unread badge. Tapping it opens
 * a panel listing recent notifications. Polls /api/notifications on
 * mount and on push-foreground events.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { NotificationsPanel, type NotificationItem } from './notifications-panel';

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export function NotificationBell({ tint = '#fff' }: { tint?: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { userId } = useUser();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get<NotificationsResponse>('/api/notifications');
      setItems(res.notifications ?? []);
      setUnread(res.unreadCount ?? 0);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) {
        // eslint-disable-next-line no-console
        console.warn('notifications load failed:', e instanceof Error ? e.message : e);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when a notification lands while app is foreground.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => load());
    return () => sub.remove();
  }, [load]);

  async function handleOpen() {
    setOpen(true);
    if (unread > 0) {
      try {
        await api.patch('/api/notifications', { all: true });
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // Non-fatal — UI still shows the items.
      }
    }
  }

  if (!userId) return null;

  return (
    <>
      <Pressable
        onPress={handleOpen}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unread} unread`}
        style={styles.btn}
      >
        <Ionicons name="notifications-outline" size={22} color={tint} />
        {unread > 0 ? (
          <View style={[styles.badge, { borderColor: colors.canvas }]}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {unread > 9 ? '9+' : String(unread)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <NotificationsPanel
        visible={open}
        onClose={() => setOpen(false)}
        items={items}
        loading={loading}
        onRefresh={load}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
