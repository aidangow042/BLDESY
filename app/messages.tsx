/**
 * Messages screen — conversation list + conversation view.
 * On mobile, shows list first, then navigates into a conversation.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PageHeader } from '@/components/page-header';
import { ConversationList } from '@/components/messages/conversation-list';
import { ConversationView } from '@/components/messages/conversation-view';
import { supabase } from '@/lib/supabase';
import { fetchConversations, getOrCreateConversation } from '@/lib/messaging';
import type { Conversation } from '@/lib/messaging';

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recipientId?: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const loadConversations = useCallback(async () => {
    const convos = await fetchConversations();
    setConversations(convos);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    if (userId) loadConversations();
  }, [userId, loadConversations]);

  // Handle deep-link to specific recipient
  useEffect(() => {
    if (!userId || !params.recipientId) return;

    (async () => {
      const conversationId = await getOrCreateConversation(params.recipientId!);
      if (!conversationId) return;

      // Refresh list and select the conversation
      const convos = await fetchConversations();
      setConversations(convos);
      const target = convos.find((c) => c.id === conversationId);
      if (target) setActiveConversation(target);
    })();
  }, [userId, params.recipientId]);

  // Poll for new conversations every 15s
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(loadConversations, 15_000);
    return () => clearInterval(interval);
  }, [userId, loadConversations]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <PageHeader title="Messages" subtitle="Your conversations" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </View>
    );
  }

  // Show conversation view if one is selected
  if (activeConversation && userId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
        <ConversationView
          conversation={activeConversation}
          currentUserId={userId}
          onBack={() => {
            setActiveConversation(null);
            loadConversations(); // Refresh unread counts
          }}
        />
      </View>
    );
  }

  // Show conversation list
  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Messages" subtitle={`${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`} />
      <ConversationList
        conversations={conversations}
        onSelect={setActiveConversation}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
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
});
