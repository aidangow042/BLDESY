/**
 * Messaging helpers — all use Supabase client directly (RLS handles auth).
 * All functions accept userId to avoid redundant getUser() calls.
 */
import { supabase } from './supabase';
import { getMutualBlockIds, isBlockedEitherWay } from './blocking';

export type Conversation = {
  id: string;
  other_user: {
    id: string;
    name: string;
    avatar_url: string | null;
    role: string;
  };
  last_message_text: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
};

function normalizeParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Fetch all conversations for a user */
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, unread_count_user1, unread_count_user2, last_message_text, last_message_at, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (!conversations || conversations.length === 0) return [];

  // Hide conversations with anyone blocked in either direction.
  const blockedIds = await getMutualBlockIds(userId);
  const visibleConversations = blockedIds.size
    ? conversations.filter((c: any) => {
        const other = c.user1_id === userId ? c.user2_id : c.user1_id;
        return !blockedIds.has(other);
      })
    : conversations;

  if (visibleConversations.length === 0) return [];

  const otherUserIds = [...new Set(visibleConversations.map((c: any) =>
    c.user1_id === userId ? c.user2_id : c.user1_id,
  ))];

  const [profilesRes, buildersRes] = await Promise.all([
    supabase.from('profiles').select('id, name, avatar_url, role').in('id', otherUserIds),
    supabase.from('builder_profiles').select('user_id, profile_photo_url').in('user_id', otherUserIds),
  ]);

  const profileMap: Record<string, { name: string; avatar_url: string | null; role: string }> = {};
  for (const p of (profilesRes.data ?? []) as any[]) {
    profileMap[p.id] = { name: p.name, avatar_url: p.avatar_url, role: p.role };
  }
  for (const b of (buildersRes.data ?? []) as any[]) {
    if (b.profile_photo_url && profileMap[b.user_id] && !profileMap[b.user_id].avatar_url) {
      profileMap[b.user_id].avatar_url = b.profile_photo_url;
    }
  }

  return visibleConversations.map((c: any) => {
    const isUser1 = c.user1_id === userId;
    const otherUserId = isUser1 ? c.user2_id : c.user1_id;
    const unreadCount = isUser1 ? c.unread_count_user1 : c.unread_count_user2;
    const otherUser = profileMap[otherUserId] || { name: 'Unknown', avatar_url: null, role: 'customer' };

    return {
      id: c.id,
      other_user: { id: otherUserId, ...otherUser },
      last_message_text: c.last_message_text,
      last_message_at: c.last_message_at,
      unread_count: unreadCount,
      created_at: c.created_at,
    };
  });
}

/** Find or create a conversation with another user */
export async function getOrCreateConversation(userId: string, recipientId: string): Promise<string | null> {
  if (recipientId === userId) return null;

  // Can't start/continue a DM with someone either of you has blocked. The DB
  // also rejects the message insert, but bail early for a clean UX.
  if (await isBlockedEitherWay(userId, recipientId)) return null;

  const [user1_id, user2_id] = normalizeParticipants(userId, recipientId);

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .maybeSingle();

  if (existing) return (existing as any).id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user1_id, user2_id })
    .select('id')
    .single();

  if (error) {
    // Race condition — try fetching again
    const { data: retry } = await supabase
      .from('conversations')
      .select('id')
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .single();
    return retry ? (retry as any).id : null;
  }

  return (created as any).id;
}

/** Fetch messages for a conversation (newest first, then reversed for display) */
export async function fetchMessages(userId: string, conversationId: string, before?: string): Promise<{ messages: Message[]; conversation: any }> {
  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, attachment_url, attachment_type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (before) {
    query = query.lt('created_at', before);
  }

  const [messagesRes, convoRes] = await Promise.all([
    query,
    supabase
      .from('conversations')
      .select('id, user1_id, user2_id, last_message_text, last_message_at, unread_count_user1, unread_count_user2')
      .eq('id', conversationId)
      .single(),
  ]);

  // Mark as read (fire and forget)
  if (convoRes.data) {
    const c = convoRes.data as any;
    const isUser1 = c.user1_id === userId;
    supabase
      .from('conversations')
      .update(isUser1 ? { unread_count_user1: 0 } : { unread_count_user2: 0 })
      .eq('id', conversationId)
      .then(() => {});
  }

  return {
    messages: ((messagesRes.data || []) as Message[]).reverse(),
    conversation: convoRes.data,
  };
}

/** Send a message in a conversation */
export async function sendMessage(userId: string, conversationId: string, body: string): Promise<Message | null> {
  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: trimmed,
    })
    .select('id, conversation_id, sender_id, body, attachment_url, attachment_type, created_at')
    .single();

  if (error || !msg) return null;

  const message = msg as Message;

  const { data: convo } = await supabase
    .from('conversations')
    .select('user1_id, user2_id')
    .eq('id', conversationId)
    .single();

  if (convo) {
    const c = convo as any;
    const isUser1 = c.user1_id === userId;
    const unreadColumn = isUser1 ? 'unread_count_user2' : 'unread_count_user1';

    await Promise.all([
      supabase.rpc('increment_unread', {
        p_conversation_id: conversationId,
        p_column: unreadColumn,
      }),
      supabase
        .from('conversations')
        .update({
          last_message_text: trimmed.slice(0, 100),
          last_message_at: message.created_at,
        })
        .eq('id', conversationId),
    ]);
  }

  return message;
}

/** Get total unread count for a user */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('user1_id, user2_id, unread_count_user1, unread_count_user2')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (!conversations) return 0;

  return (conversations as any[]).reduce((sum, c) => {
    const isUser1 = c.user1_id === userId;
    return sum + (isUser1 ? c.unread_count_user1 : c.unread_count_user2);
  }, 0);
}
