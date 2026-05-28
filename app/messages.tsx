/**
 * Messages screen — conversation list + conversation view. Mirrors
 * `~/bldesy-web/app/messages/page.tsx`: list shows first, tap → conversation
 * slides in with a back button.
 *
 * The internal `<ConversationList>` and `<ConversationView>` components in
 * `components/messages/` still use legacy theme aliases — they render against
 * the new tokens transparently via `Colors[scheme].teal → primary` etc.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppShell } from '@/components/layout';
import { ConversationList } from '@/components/messages/conversation-list';
import { ConversationView } from '@/components/messages/conversation-view';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { fetchConversations, getOrCreateConversation } from '@/lib/messaging';
import type { Conversation } from '@/lib/messaging';

export default function MessagesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const params = useLocalSearchParams<{ recipientId?: string }>();
  const { userId } = useUser();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const convos = await fetchConversations(userId);
    setConversations(convos);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadConversations();
  }, [userId, loadConversations]);

  // Deep-link to specific recipient
  useEffect(() => {
    if (!userId || !params.recipientId) return;
    (async () => {
      const conversationId = await getOrCreateConversation(userId, params.recipientId!);
      if (!conversationId) return;
      const convos = await fetchConversations(userId);
      setConversations(convos);
      const target = convos.find((c) => c.id === conversationId);
      if (target) setActiveConversation(target);
    })();
  }, [userId, params.recipientId]);

  // Real-time conversation updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadConversations())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadConversations]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }

  // ── Active conversation view ──
  if (activeConversation && userId) {
    return (
      <AppShell
        title={activeConversation.other_user?.name || 'Conversation'}
        showBack
        onBackPress={() => {
          setActiveConversation(null);
          loadConversations();
        }}
      >
        <ConversationView
          conversation={activeConversation}
          currentUserId={userId}
          onBack={() => {
            setActiveConversation(null);
            loadConversations();
          }}
        />
      </AppShell>
    );
  }

  // ── Inbox ──
  return (
    <AppShell title="Messages" showBack>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (
          <>
            <View style={styles.countRow}>
              <Text style={[styles.countText, { color: c.textSecondary }]}>
                {conversations.length === 0
                  ? 'No conversations yet'
                  : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <ConversationList
              conversations={conversations}
              onSelect={setActiveConversation}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          </>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  countText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
