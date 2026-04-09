import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Conversation } from '@/lib/messaging';

type Props = {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (conversation: Conversation) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function roleBadge(role: string) {
  if (role === 'builder') return 'Builder';
  if (role === 'enterprise') return 'Enterprise';
  return null;
}

export function ConversationList({ conversations, activeId, onSelect, refreshing, onRefresh }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  function renderItem({ item }: { item: Conversation }) {
    const isActive = item.id === activeId;
    const hasUnread = item.unread_count > 0;
    const badge = roleBadge(item.other_user.role);
    const avatarUri =
      item.other_user.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.other_user.name)}&background=0d9488&color=fff&size=96`;

    return (
      <Pressable
        style={[
          styles.item,
          {
            backgroundColor: isActive
              ? isDark ? colors.tealBg : colors.tealLight
              : 'transparent',
          },
        ]}
        onPress={() => onSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${item.other_user.name}`}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {hasUnread && <View style={[styles.unreadDot, { backgroundColor: colors.teal }]} />}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.name,
                { color: colors.text },
                hasUnread && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {item.other_user.name}
            </Text>
            {badge && (
              <View style={[styles.roleBadge, { backgroundColor: colors.tealBg }]}>
                <Text style={[styles.roleBadgeText, { color: colors.teal }]}>{badge}</Text>
              </View>
            )}
          </View>
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.preview,
                { color: hasUnread ? colors.text : colors.textSecondary },
                hasUnread && { fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {item.last_message_text || 'No messages yet'}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {timeAgo(item.last_message_at)}
            </Text>
          </View>
        </View>

        {/* Unread badge */}
        {hasUnread && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.teal }]}>
            <Text style={styles.unreadText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start a conversation from a builder's profile
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    ...Type.bodySemiBold,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    ...Type.micro,
    textTransform: 'uppercase',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  preview: {
    ...Type.caption,
    flex: 1,
  },
  time: {
    ...Type.caption,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: Spacing['4xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Type.h2,
  },
  emptySubtitle: {
    ...Type.body,
    textAlign: 'center',
  },
});
