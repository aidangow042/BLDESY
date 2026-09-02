/**
 * NotificationBell — port of `~/bldesy-web/components/enterprise/notification-bell.tsx`
 * (used by BOTH the tradie portal and the enterprise hub; `context` decides
 * where a notification deep-links).
 *
 * List + unread count come from GET /api/notifications (lib/data/notifications);
 * new rows arrive over the `notifications` realtime channel. Opening the tray
 * counts as seeing what's in it: the badge clears (and persists read) while
 * this session's unread dots stay until items are tapped.
 */
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import {
  listNotifications,
  markNotificationsRead,
  type NotificationRow,
} from '@/lib/data/notifications';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export type NotificationBellContext = 'tradie' | 'enterprise';

/** Where a notification lands — the web bell's getLink(), routes mirrored. */
export function notificationHref(n: Pick<NotificationRow, 'type' | 'metadata'>, context: NotificationBellContext): string {
  const meta = (n.metadata ?? {}) as Record<string, unknown>;
  const jobId = typeof meta.job_id === 'string' ? meta.job_id : null;
  if (context === 'tradie') {
    // Weekly availability pulse lands on the one-tap confirm banner.
    if (meta.weekly_pulse === 'availability') {
      return `${ROUTES.portal}?confirm=availability`;
    }
    switch (n.type) {
      case 'message_received':
        return ROUTES.portalMessages;
      case 'referral_verified':
        return ROUTES.portalRefer;
      case 'new_job_match':
        return jobId ? ROUTES.portalJob(jobId) : ROUTES.portalJobsResidential;
      default:
        // eoi_received, builder_approved, billing_*, milestone → dashboard
        return jobId ? ROUTES.portalJob(jobId) : ROUTES.portal;
    }
  }
  if (jobId) return `/enterprise/jobs/${jobId}`;
  return ROUTES.enterprise;
}

export function NotificationBell({
  context = 'enterprise',
  /** Distance from the top of the window to the tray's top edge (below the header). */
  anchorTop,
}: {
  context?: NotificationBellContext;
  anchorTop: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    listNotifications()
      .then((data) => {
        if (mounted && data) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as NotificationRow;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 30));
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function markAllRead() {
    await markNotificationsRead('all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await markNotificationsRead([id]).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  const toggleOpen = useCallback(() => {
    const opening = !open;
    setOpen(opening);
    // Opening the tray counts as seeing what's in it: clear the badge (and
    // persist read) but keep this session's unread dots until items are
    // clicked, so new entries still stand out.
    if (opening && unreadCount > 0) {
      setUnreadCount(0);
      markNotificationsRead('all').catch(() => {});
    }
  }, [open, unreadCount]);

  function typeIcon(type: string): { name: IoniconName; color: string; bg: string } {
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

  const trayWidth = Math.min(320, windowWidth - Spacing.lg * 2); // web w-80

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        accessibilityState={{ expanded: open }}
        onPress={toggleOpen}
        hitSlop={6}
        style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
      >
        <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.5)" />
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: c.error }]}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Dropdown */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close notifications" />
        <View
          style={[
            styles.tray,
            Shadows.xl,
            { top: anchorTop, width: trayWidth, backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.trayHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.trayTitle, { color: c.textPrimary }]}>Notifications</Text>
            {unreadCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => void markAllRead()} hitSlop={6}>
                <Text style={[styles.markAll, { color: c.indigo }]}>Mark all read</Text>
              </Pressable>
            ) : null}
          </View>

          {/* List */}
          <ScrollView style={styles.list} bounces={false}>
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((n, i) => {
                const icon = typeIcon(n.type);
                return (
                  <Pressable
                    key={n.id}
                    accessibilityRole="link"
                    onPress={() => {
                      if (!n.read) void markRead(n.id);
                      setOpen(false);
                      router.push(notificationHref(n, context) as Href);
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border + '80' },
                      !n.read && { backgroundColor: c.indigo + '08' },
                      pressed && { backgroundColor: c.canvas + '80' },
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: icon.bg }]}>
                      <Ionicons name={icon.name} size={16} color={icon.color} />
                    </View>
                    <View style={styles.rowBody}>
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
                        <Text numberOfLines={1} style={[styles.rowSub, { color: c.textSecondary }]}>
                          {n.body}
                        </Text>
                      ) : null}
                      <Text style={[styles.rowSub, { color: c.textSecondary + '99' }]}>
                        {relativeTime(n.created_at)}
                      </Text>
                    </View>
                    {!n.read ? <View style={[styles.unreadDot, { backgroundColor: c.indigo }]} /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  bellPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  tray: {
    position: 'absolute',
    right: Spacing.lg,
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
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  markAll: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  list: {
    maxHeight: 320, // web max-h-80
  },
  empty: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    marginTop: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  unreadDot: {
    marginTop: Spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
