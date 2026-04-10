/**
 * Messages screen — conversation list + conversation view.
 * On mobile, shows list first, then navigates into a conversation.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const router = useRouter();
  const params = useLocalSearchParams<{ recipientId?: string }>();

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    if (userId) loadConversations();
  }, [userId, loadConversations]);

  // Deep-link to specific recipient
  useEffect(() => {
    if (!userId || !params.recipientId) return;
    (async () => {
      const conversationId = await getOrCreateConversation(params.recipientId!);
      if (!conversationId) return;
      const convos = await fetchConversations();
      setConversations(convos);
      const target = convos.find((c) => c.id === conversationId);
      if (target) setActiveConversation(target);
    })();
  }, [userId, params.recipientId]);

  // Poll for new conversations
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

  // ── Chat view (full screen) ──
  if (activeConversation && userId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
        <ConversationView
          conversation={activeConversation}
          currentUserId={userId}
          onBack={() => {
            setActiveConversation(null);
            loadConversations();
          }}
        />
      </View>
    );
  }

  // ── Inbox (conversation list) ──
  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header with back button */}
      <LinearGradient
        colors={isDark ? ['#134E4A', '#0D3B3B'] : ['#0D7C66', '#0A6B58']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="rgba(255,255,255,0.9)" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading...' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <ConversationList
          conversations={conversations}
          onSelect={setActiveConversation}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
