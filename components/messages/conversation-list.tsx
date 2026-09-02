/**
 * The inbox rows — port of ~/bldesy-web/components/messages/conversation-list.tsx.
 * Avatar (or initial), name + role badge, relative time, snippet, unread dot.
 */
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Conversation, OtherUser } from '@/lib/data/messages';
import { relativeTime } from '@/lib/format';

export function roleBadgeLabel(user: OtherUser): string {
  if (user.is_builder) return 'Builder';
  if (user.is_enterprise) return 'Enterprise';
  return 'Customer';
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  refreshing = false,
  onRefresh,
  bottomInset = 0,
}: ConversationListProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset + Spacing['2xl'] }]}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined
      }
      renderItem={({ item }) => {
        const isActive = item.id === activeId;
        const hasUnread = item.unread_count > 0;
        return (
          <Pressable
            onPress={() => onSelect(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Conversation with ${item.other_user.name}${hasUnread ? ', unread' : ''}`}
            style={[
              styles.row,
              Shadows.sm,
              isActive
                ? { backgroundColor: c.primaryLight, borderColor: c.primary + '4D' }
                : { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: c.primary + '1A' }]}>
              {item.other_user.avatar_url ? (
                <Image
                  source={{ uri: item.other_user.avatar_url }}
                  accessibilityLabel={`${item.other_user.name}'s avatar`}
                  contentFit="cover"
                  cachePolicy="disk"
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={[styles.avatarInitial, { color: c.primary }]}>
                  {(item.other_user.name || '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={styles.content}>
              <View style={styles.topRow}>
                <View style={styles.nameRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.name,
                      { color: c.textPrimary },
                      hasUnread ? styles.nameUnread : styles.nameRead,
                    ]}
                  >
                    {item.other_user.name}
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: c.primaryBg }]}>
                    <Text style={[styles.roleBadgeText, { color: c.primary }]}>
                      {roleBadgeLabel(item.other_user).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.time, { color: c.textSecondary }]}>{relativeTime(item.last_message_at)}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.snippet,
                    hasUnread
                      ? { color: c.textPrimary, fontFamily: FontFamily.bodyMedium, fontWeight: '500' }
                      : { color: c.textSecondary },
                  ]}
                >
                  {item.last_message_text || 'No messages yet'}
                </Text>
                {hasUnread ? <View style={[styles.unreadDot, { backgroundColor: c.primary }]} /> : null}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.sm, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  content: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  name: { fontSize: 14, flexShrink: 1 },
  nameUnread: { fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  nameRead: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  roleBadge: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  roleBadgeText: { fontSize: 9, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  time: { fontSize: 11, fontFamily: FontFamily.body, flexShrink: 0 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: 2 },
  snippet: { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: FontFamily.body },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
});
