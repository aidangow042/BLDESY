import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { fetchMessages, sendMessage } from '@/lib/messaging';
import type { Conversation, Message } from '@/lib/messaging';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';

type Props = {
  conversation: Conversation;
  currentUserId: string;
  onBack: () => void;
};

export function ConversationView({ conversation, currentUserId, onBack }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { messages: msgs } = await fetchMessages(conversation.id);
    setMessages(msgs);
    setLoading(false);
  }, [conversation.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time message subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Skip if it's our own optimistic message (already in state)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend(text: string) {
    // Optimistic insert
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      body: text,
      attachment_url: null,
      attachment_type: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const sent = await sendMessage(conversation.id, text);
    if (sent) {
      // Replace temp with real message
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? sent : m)));
    }
  }

  const { other_user } = conversation;
  const avatarUri =
    other_user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(other_user.name)}&background=0d9488&color=fff&size=96`;

  function renderItem({ item, index }: { item: Message; index: number }) {
    const prev = index > 0 ? messages[index - 1] : null;
    const isGrouped = prev ? prev.sender_id === item.sender_id && (new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000) : false;

    // Date divider
    const itemDate = item.created_at.slice(0, 10);
    const prevDate = prev?.created_at.slice(0, 10);
    const showDate = !prev || itemDate !== prevDate;

    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            <View style={[styles.datePill, { backgroundColor: isDark ? colors.surface : '#f1f5f9' }]}>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDateLabel(item.created_at)}
              </Text>
            </View>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        <MessageBubble
          body={item.body}
          isMine={item.sender_id === currentUserId}
          timestamp={item.created_at}
          attachmentUrl={item.attachment_url}
          attachmentType={item.attachment_type}
          isGrouped={isGrouped}
        />
      </>
    );
  }

  function formatDateLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderDateDivider(date: string) {
    return (
      <View style={styles.dateDivider}>
        <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
        <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : '#ffffff', borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Pressable
          style={styles.headerUser}
          onPress={() => {
            if (other_user.role === 'builder') {
              router.push({ pathname: '/builder-profile', params: { id: other_user.id } } as any);
            }
          }}
        >
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
          <View>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {other_user.name}
            </Text>
            {other_user.role !== 'customer' && (
              <Text style={[styles.headerRole, { color: colors.teal }]}>
                {other_user.role === 'builder' ? 'Builder' : 'Enterprise'}
              </Text>
            )}
          </View>
        </Pressable>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Send a message to start the conversation
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    ...Type.bodySemiBold,
  },
  headerRole: {
    ...Type.micro,
    textTransform: 'uppercase',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['4xl'],
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
