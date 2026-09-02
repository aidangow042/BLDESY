/**
 * NotificationBell — port of ~/bldesy-web/components/enterprise/notification-bell.tsx
 * against lib/data/notifications.ts (list + mark-read persisted server-side)
 * with the same Realtime INSERT subscription on `notifications`.
 *
 * Opening the tray counts as seeing what's in it: the badge clears (and the
 * read state persists) but this session's unread dots stay until a row is
 * tapped, so new entries still stand out. `context` decides where a row
 * deep-links (lib/enterprise-hub/notification-links.ts).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useUser } from '@/lib/auth-context';
import { listNotifications, markNotificationsRead, type NotificationRow } from '@/lib/data/notifications';
import { toHref } from '@/lib/enterprise-hub/nav';
import {
  bellRelativeTime,
  notificationHref,
  unreadBadgeLabel,
  type NotificationBellContext,
} from '@/lib/enterprise-hub/notification-links';
import { db } from '@/lib/supabase';

import { useHubTheme, type IoniconName } from './hub-primitives';
import { HUB_SHELL_TEXT_DIM } from './hub-theme';

const TRAY_WIDTH = 320;
const MAX_ROWS = 30;

function typeIcon(type: string, c: ReturnType<typeof useHubTheme>): { name: IoniconName; color: string; bg: string } {
  switch (type) {
    case 'new_application':
      return { name: 'person-outline', color: c.indigo, bg: c.indigo + '1A' };
    case 'job_filled':
      return { name: 'checkmark-circle-outline', color: c.success, bg: c.successBg };
    case 'job_expiring':
      return { name: 'time-outline', color: c.warning, bg: c.warning + '1A' };
    case 'milestone':
      return { name: 'star-outline', color: c.primary, bg: c.primaryBg };
    case 'referral_verified':
      return { name: 'gift-outline', color: c.primary, bg: c.primaryBg };
    default:
      return { name: 'notifications-outline', color: c.textSecondary, bg: c.primaryBg };
  }
}

export function NotificationBell({
  context = 'enterprise',
  /** Bell glyph colour on the shell (web `text-white/50`). */
  tint = HUB_SHELL_TEXT_DIM,
}: {
  /** Which shell the bell sits in — decides where notifications deep-link. */
  context?: NotificationBellContext;
  tint?: string;
} = {}) {
  const c = useHubTheme();
  const insets = useSafeAreaInsets();
  const { authedUser } = useUser();
  const uid = authedUser?.id ?? null;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  // Fetch notifications
  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    listNotifications()
      .then((page) => {
        if (!mounted) return;
        setNotifications(page.notifications);
        setUnreadCount(page.unreadCount);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [uid]);

  // Realtime subscription
  useEffect(() => {
    if (!uid) return;
    const channel = db
      .channel(`notifications-bell:${uid}:${instanceId.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          const next = payload.new as NotificationRow;
          setNotifications((prev) => [next, ...prev].slice(0, MAX_ROWS));
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();
    return () => {
      void db.removeChannel(channel);
    };
  }, [uid]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markNotificationsRead('all').catch(() => {});
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationsRead([id]).catch(() => {});
  }, []);

  function toggleOpen() {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      setUnreadCount(0);
      markNotificationsRead('all').catch(() => {});
    }
  }

  function openRow(n: NotificationRow) {
    if (!n.read) void markRead(n.id);
    setOpen(false);
    router.push(toHref(notificationHref(n, context)));
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        accessibilityState={{ expanded: open }}
        onPress={toggleOpen}
        hitSlop={6}
        style={({ pressed }) => [styles.bell, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}
      >
        <Ionicons name="notifications-outline" size={20} color={tint} />
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: c.error }]}>
            <Text style={styles.badgeLabel}>{unreadBadgeLabel(unreadCount)}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} accessibilityLabel="Close notifications">
          <Pressable
            onPress={() => {}}
            accessibilityViewIsModal
            style={[
              styles.tray,
              Shadows.xl,
              { backgroundColor: c.surface, borderColor: c.border, marginTop: insets.top + 56 + Spacing.sm },
            ]}
          >
            <View style={[styles.trayHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.trayTitle, { color: c.textPrimary }]}>Notifications</Text>
              {unreadCount > 0 || notifications.some((n) => !n.read) ? (
                <Pressable accessibilityRole="button" onPress={markAllRead} hitSlop={8}>
                  <Text style={[styles.markAll, { color: c.indigo }]}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.trayEmpty}>
                <Text style={[styles.trayEmptyText, { color: c.textSecondary }]}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(n) => n.id}
                style={styles.trayList}
                ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.border + '80' }]} />}
                renderItem={({ item: n }) => {
                  const icon = typeIcon(n.type, c);
                  return (
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => openRow(n)}
                      style={({ pressed }) => [
                        styles.row,
                        !n.read && { backgroundColor: c.indigo + '08' },
                        pressed && { backgroundColor: c.canvas },
                      ]}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: icon.bg }]}>
                        <Ionicons name={icon.name} size={16} color={icon.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[
                            styles.rowTitle,
                            n.read
                              ? { color: c.textSecondary }
                              : { color: c.textPrimary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
                          ]}
                        >
                          {n.title}
                        </Text>
                        {n.body ? (
                          <Text numberOfLines={1} style={[styles.rowBody, { color: c.textSecondary }]}>
                            {n.body}
                          </Text>
                        ) : null}
                        <Text style={[styles.rowTime, { color: c.textSecondary + '99' }]}>
                          {bellRelativeTime(n.created_at)}
                        </Text>
                      </View>
                      {!n.read ? <View style={[styles.unreadDot, { backgroundColor: c.indigo }]} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
  },
  tray: {
    width: TRAY_WIDTH,
    maxWidth: '100%',
    maxHeight: 440,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  trayTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  markAll: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  trayEmpty: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  trayEmptyText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  trayList: {
    maxHeight: 380,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  rowBody: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  rowTime: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
});
