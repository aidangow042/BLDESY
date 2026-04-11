import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing } from '@/constants/theme';
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
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? conversations.filter(c => c.other_user.name.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  // Sort: unread first, then by last_message_at
  const sorted = [...filtered].sort((a, b) => {
    if (a.unread_count > 0 && b.unread_count === 0) return -1;
    if (a.unread_count === 0 && b.unread_count > 0) return 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  function renderItem({ item }: { item: Conversation }) {
    const isActive = item.id === activeId;
    const hasUnread = item.unread_count > 0;
    const badge = roleBadge(item.other_user.role);
    const avatarUri =
      item.other_user.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.other_user.name)}&background=4f46e5&color=fff&size=96`;

    return (
      <Pressable
        style={[
          styles.item,
          {
            backgroundColor: isActive
              ? isDark ? 'rgba(79,70,229,0.1)' : '#eef2ff'
              : 'transparent',
            borderLeftColor: isActive ? '#4f46e5' : 'transparent',
            borderLeftWidth: isActive ? 3 : 3,
          },
        ]}
        onPress={() => onSelect(item)}
      >
        {/* Avatar with status dot */}
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
          <View style={[styles.statusDot, { backgroundColor: '#059669', borderColor: isDark ? colors.surface : '#fff' }]} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: colors.text }, hasUnread && { fontWeight: '700' }]} numberOfLines={1}>
              {item.other_user.name}
            </Text>
            {badge && (
              <View style={[styles.roleBadge, { backgroundColor: isDark ? 'rgba(79,70,229,0.15)' : '#eef2ff' }]}>
                <Text style={[styles.roleBadgeText, { color: isDark ? '#818cf8' : '#4f46e5' }]}>{badge}</Text>
              </View>
            )}
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {timeAgo(item.last_message_at)}
            </Text>
          </View>
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
        </View>

        {/* Unread badge */}
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={sorted.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(79,70,229,0.1)' : '#eef2ff' }]}>
              <Ionicons name="chatbubbles-outline" size={40} color={isDark ? '#818cf8' : '#a5b4fc'} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Start a conversation from a builder's profile or post a job to connect with tradies.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
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
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  preview: {
    fontSize: 13,
    lineHeight: 17,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: Spacing['4xl'],
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
