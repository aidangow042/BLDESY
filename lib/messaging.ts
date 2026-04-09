/**
 * Messaging helpers — all use Supabase client directly (RLS handles auth).
 */
import { supabase } from './supabase';

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

/** Fetch all conversations for the current user */
export async function fetchConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id, unread_count_user1, unread_count_user2, last_message_text, last_message_at, created_at')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (!conversations || conversations.length === 0) return [];

  const otherUserIds = [...new Set(conversations.map((c: any) =>
    c.user1_id === user.id ? c.user2_id : c.user1_id,
  ))];

  // Fetch profiles and builder avatars in parallel
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

  return conversations.map((c: any) => {
    const isUser1 = c.user1_id === user.id;
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
export async function getOrCreateConversation(recipientId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (recipientId === user.id) return null;

  const [user1_id, user2_id] = normalizeParticipants(user.id, recipientId);

  // Check for existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .maybeSingle();

  if (existing) return (existing as any).id;

  // Create new
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
export async function fetchMessages(conversationId: string, before?: string): Promise<{ messages: Message[]; conversation: any }> {
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
  const { data: { user } } = await supabase.auth.getUser();
  if (user && convoRes.data) {
    const c = convoRes.data as any;
    const isUser1 = c.user1_id === user.id;
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
export async function sendMessage(conversationId: string, body: string): Promise<Message | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  // Insert message
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: trimmed,
    })
    .select('id, conversation_id, sender_id, body, attachment_url, attachment_type, created_at')
    .single();

  if (error || !msg) return null;

  const message = msg as Message;

  // Get conversation to determine which unread column to increment
  const { data: convo } = await supabase
    .from('conversations')
    .select('user1_id, user2_id')
    .eq('id', conversationId)
    .single();

  if (convo) {
    const c = convo as any;
    const isUser1 = c.user1_id === user.id;
    const unreadColumn = isUser1 ? 'unread_count_user2' : 'unread_count_user1';

    // Update conversation metadata + increment recipient unread
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

/** Get total unread count for the current user */
export async function getTotalUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: conversations } = await supabase
    .from('conversations')
    .select('user1_id, user2_id, unread_count_user1, unread_count_user2')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (!conversations) return 0;

  return (conversations as any[]).reduce((sum, c) => {
    const isUser1 = c.user1_id === user.id;
    return sum + (isUser1 ? c.unread_count_user1 : c.unread_count_user2);
  }, 0);
}
