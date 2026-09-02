/**
 * Messaging — typed client for the website's message routes:
 *   GET/POST ~/bldesy-web/app/api/messages/conversations/route.ts
 *   GET/POST ~/bldesy-web/app/api/messages/[conversationId]/route.ts
 *   GET      ~/bldesy-web/app/api/messages/unread/route.ts
 * plus `useUnreadCount()` — port of ~/bldesy-web/lib/hooks/use-unread-count.ts
 * (fetch on mount + Supabase Realtime on `conversations`), extended with the
 * foreground/interval refresh a native inbox badge needs.
 *
 * Every write goes through the API: conversation-create checks blocking and
 * whether the tradie accepts new enquiries, message-send runs the rate limit,
 * unread bookkeeping, first-inbound-message billing capture and the recipient
 * alert. GET stays open so a user can always read their own history. The
 * website is still in waitlist mode until launch: POSTs answer 403
 * `{ code: "waitlist_mode" }` today — check `isWaitlistClosed(e)`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api, ApiError, isWaitlistClosed } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { WAITLIST_CLOSED_ERROR } from '@/lib/data/eoi';
import { db } from '@/lib/supabase';
import type { Database } from '@/types/database';

export interface OtherUser {
  id: string;
  name: string;
  avatar_url: string | null;
  /** Role flags derived from extension-table existence; multi-role users get both. */
  is_builder: boolean;
  is_enterprise: boolean;
}

export interface Conversation {
  id: string;
  other_user: OtherUser;
  last_message_text: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
}

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];

export interface Thread {
  /** Ascending (oldest first), up to MESSAGES_PAGE_SIZE per page. */
  messages: Message[];
  conversation: ConversationRow;
}

export const MESSAGES_PAGE_SIZE = 50;
export const MESSAGE_MAX_LENGTH = 2000;

/** Website copy — lib/schemas.ts sendMessageSchema + components/messages/*. */
export const MESSAGE_BODY_REQUIRED = 'Message body is required.';
export const MESSAGE_TOO_LONG = 'Message too long (max 2000 characters).';
export const CONVERSATION_OPEN_ERROR = "Couldn't open conversation. Please try again.";
export const CONVERSATIONS_LOAD_ERROR = "Couldn't load conversations. Please try again.";
export const CONNECTION_ERROR = 'Something went wrong. Please check your connection.';
/** Bubble label the website shows on a message that failed to send. */
export const MESSAGE_SEND_FAILED_LABEL = 'Failed to send';

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/** Client-side twin of the server's sendMessageSchema (trim, 1–2000 chars). */
export function validateMessageBody(
  body: string,
): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: MESSAGE_BODY_REQUIRED };
  if (trimmed.length > MESSAGE_MAX_LENGTH) return { ok: false, error: MESSAGE_TOO_LONG };
  return { ok: true, body: trimmed };
}

/** `/api/messages/{conversationId}[?before=<iso>]` */
export function threadPath(conversationId: string, before?: string | null): string {
  const base = `/api/messages/${encodeURIComponent(conversationId)}`;
  return before ? `${base}?before=${encodeURIComponent(before)}` : base;
}

/**
 * What to show when opening a conversation fails — the website toasts one
 * generic line for every API error and a connection line for network
 * failures; the waitlist refusal is the one case with its own copy.
 */
export function conversationErrorMessage(e: unknown): string {
  if (isWaitlistClosed(e)) return (e as ApiError).message || WAITLIST_CLOSED_ERROR.error;
  if (e instanceof ApiError) return CONVERSATION_OPEN_ERROR;
  return CONNECTION_ERROR;
}

/**
 * What to show when a send fails. The server's messages are already the
 * user-facing copy ("Message is too long (max 2000 characters).", "Message
 * can't be empty.", "You're not a participant of this conversation.", "Too
 * many messages. Please slow down.", "You don't have permission to send to
 * this conversation.", the waitlist refusal); network failures get the
 * connection line.
 */
export function sendMessageErrorMessage(e: unknown): string {
  if (isWaitlistClosed(e)) return (e as ApiError).message || WAITLIST_CLOSED_ERROR.error;
  if (e instanceof ApiError) return e.message || CONNECTION_ERROR;
  return CONNECTION_ERROR;
}

/* ───────────────────────────── API ───────────────────────────── */

/** The signed-in user's conversations, most recent activity first (max 50). */
export async function listConversations(): Promise<Conversation[]> {
  return api.get<Conversation[]>('/api/messages/conversations');
}

/**
 * Find-or-create the conversation with `recipientId`; resolves to its id.
 * 400 self/invalid, 403 waitlist / "This tradie isn't taking new enquiries
 * right now." (an existing thread is returned instead of the 403), 429.
 */
export async function createConversation(recipientId: string): Promise<string> {
  const res = await api.post<{ conversation_id: string }>('/api/messages/conversations', {
    recipient_id: recipientId,
  });
  return res.conversation_id;
}

/**
 * One page of a thread (ascending, 50 per page; pass the oldest message's
 * `created_at` as `before` to page back). The GET also resets the caller's
 * unread count for the conversation server-side.
 */
export async function getThread(conversationId: string, before?: string | null): Promise<Thread> {
  return api.get<Thread>(threadPath(conversationId, before));
}

/** Send a message; resolves with the stored row (201). */
export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const valid = validateMessageBody(body);
  if (!valid.ok) throw new ApiError(400, valid.error);
  return api.post<Message>(threadPath(conversationId), { body: valid.body });
}

/** Total unread across the caller's conversations. */
export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{ unread: number }>('/api/messages/unread');
  return res.unread || 0;
}

/* ───────────────────────────── Hook ───────────────────────────── */

const DEFAULT_POLL_MS = 30_000;

/**
 * Live unread badge count. Fetches on mount, on every Realtime INSERT/UPDATE
 * of a `conversations` row the user is party to (filtered client-side on
 * `user1_id`/`user2_id`, as the website does), when the app returns to the
 * foreground, and on an interval. 0 for guests. Fetch failures are swallowed
 * (the badge stays stale) — web parity.
 */
export function useUnreadCount(options: { pollMs?: number } = {}): {
  count: number;
  refresh: () => Promise<void>;
} {
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const { authedUser } = useUser();
  const userId = authedUser?.id ?? null;
  const [count, setCount] = useState(0);
  // Unique topic per hook instance: supabase-js returns an existing channel
  // for a repeated topic, so two badges sharing "unread-count" would tear
  // down each other's subscription on unmount.
  const instanceId = useRef(Math.random().toString(36).slice(2));

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    try {
      setCount(await getUnreadCount());
    } catch {
      // Silently fail
    }
  }, [userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Listen for conversation updates via Supabase Realtime
  useEffect(() => {
    if (!userId) return;
    const onChange = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new;
      if (row.user1_id === userId || row.user2_id === userId) {
        fetchCount();
      }
    };
    const channel = db
      .channel(`unread-count:${userId}:${instanceId.current}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, onChange)
      .subscribe();

    return () => {
      void db.removeChannel(channel);
    };
  }, [userId, fetchCount]);

  // Foreground + interval refresh (native twin of the website's focus/visibility refetches).
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchCount();
    });
    const id = setInterval(fetchCount, pollMs);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [userId, fetchCount, pollMs]);

  return { count: userId ? count : 0, refresh: fetchCount };
}

/** Result of POST /api/billing/void-contact (website lib/billing/contacts.ts). */
export interface VoidContactResult {
  ok: true;
  voided: number;
  reverted: boolean;
  count: number;
}

/**
 * Junk-flag a homeowner conversation so it stops counting as a qualified
 * contact (website ConversationView ⋯ menu → POST /api/billing/void-contact).
 * Only within the 7-day void window; 409 = already voided, 422 = window expired.
 */
export async function flagConversationJunk(conversationId: string, reason = 'junk'): Promise<VoidContactResult> {
  return api.post<VoidContactResult>('/api/billing/void-contact', { conversationId, reason });
}
