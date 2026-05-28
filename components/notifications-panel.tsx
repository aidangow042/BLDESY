/**
 * Notifications panel — sheet modal listing the recent in-app
 * notifications fetched from /api/notifications. Tapping a row routes
 * to the relevant detail screen using deep-link metadata when present.
 */
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: NotificationItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

function iconForType(type: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'new_application':
      return 'document-text-outline';
    case 'job_filled':
      return 'checkmark-done-outline';
    case 'job_expiring':
      return 'time-outline';
    case 'milestone':
      return 'flag-outline';
    case 'marketing':
      return 'megaphone-outline';
    default:
      return 'notifications-outline';
  }
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function NotificationsPanel({ visible, onClose, items, loading, onRefresh }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  function handlePress(n: NotificationItem) {
    const meta = n.metadata ?? {};
    if (meta.deep_link) {
      onClose();
      router.push(meta.deep_link as any);
      return;
    }
    if (meta.job_id) {
      onClose();
      router.push({ pathname: '/job-detail', params: { id: meta.job_id } } as any);
      return;
    }
    if (meta.builder_id) {
      onClose();
      router.push({ pathname: '/builder-profile', params: { id: meta.builder_id } } as any);
      return;
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: isDark ? colors.surface : '#fff' },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[Type.h2, { color: colors.text }]}>Notifications</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.icon} />
            </Pressable>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.teal} />
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyWrap}>
                  <ActivityIndicator color={colors.teal} />
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Ionicons name="notifications-off-outline" size={48} color={colors.icon} />
                  <Text style={[Type.bodySemiBold, { color: colors.text, marginTop: Spacing.md }]}>
                    No notifications yet
                  </Text>
                  <Text style={[Type.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Job applications, milestones and updates will land here.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePress(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.02)'
                      : 'transparent',
                    borderBottomColor: colors.borderLight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: item.read ? colors.border : colors.tealBg,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconForType(item.type)}
                    size={18}
                    color={item.read ? colors.icon : colors.teal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text
                      style={[
                        Type.bodySemiBold,
                        { color: colors.text, flex: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title ?? 'Notification'}
                    </Text>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                  {item.body ? (
                    <Text
                      style={[Type.caption, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  emptyWrap: {
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
