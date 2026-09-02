/**
 * Shared AI Assist conversation — the app twin of the web's
 * `~/bldesy-web/components/ai/chat-provider.tsx`.
 *
 * One thread is shared by the /ai tab and the floating AI Assist panel
 * (`assist-widget.tsx`) and restored between launches from AsyncStorage under
 * `bldesy_ai_chat_v1` — the same `{ v: 1, messages }` envelope (last 50
 * messages) the web keeps in sessionStorage. Replies come from the `ai-chat`
 * Edge Function via `supabase.functions.invoke`.
 *
 * State lives in a module-level store (read with useSyncExternalStore) rather
 * than a React context: the root layout is owned elsewhere and the panel is
 * mounted per screen by AppShell, so every surface has to see the same thread
 * without a shared ancestor. `<ChatProvider>` is kept as a passthrough so a
 * future root layout can mount it exactly like the web without touching
 * consumers.
 *
 * The first send on a device is gated by the AI consent disclosure
 * (`components/ai-consent-modal.tsx`) — `useChat().sendMessage` runs it and the
 * calling surface renders `consentModal`.
 */
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { useAiConsent } from '@/components/ai-consent-modal';
import { supabase } from '@/lib/supabase';
import type { BuilderRec, ChatMessage } from './types';

export const CHAT_STORAGE_KEY = 'bldesy_ai_chat_v1';
/** Messages kept between launches (web: `messages.slice(-50)`). */
const STORED_LIMIT = 50;
/** Conversation window sent to the model per turn (web: `.slice(-30)`). */
const CONTEXT_LIMIT = 30;
/** Per-message cap on what is sent (web: `content.slice(0, 2000)`). */
const CONTENT_LIMIT = 2000;

/* Error copy — verbatim from the web provider. */
const ERROR_SIGN_IN = 'Please sign in to use AI Assist';
const ERROR_RATE_LIMITED = 'Too many requests — please wait a moment';
const ERROR_GENERIC = 'Something went wrong. Try again.';

interface AiChatReply {
  reply?: string;
  builders?: BuilderRec[] | null;
  searchParams?: Record<string, string> | null;
}

export interface ChatState {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string | null;
  panelOpen: boolean;
  /** Stored history has been read — persist only after this so the initial [] never wipes it. */
  hydrated: boolean;
}

let state: ChatState = {
  messages: [],
  input: '',
  loading: false,
  error: null,
  panelOpen: false,
  hydrated: false,
};

const listeners = new Set<() => void>();

function patch(next: Partial<ChatState>) {
  const prev = state;
  state = { ...prev, ...next };
  listeners.forEach((listener) => listener());
  if (state.hydrated && state.messages !== prev.messages) persist(state.messages);
}

function getSnapshot(): ChatState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void hydrate();
  return () => {
    listeners.delete(listener);
  };
}

function persist(messages: ChatMessage[]) {
  AsyncStorage.setItem(
    CHAT_STORAGE_KEY,
    JSON.stringify({ v: 1, messages: messages.slice(-STORED_LIMIT) }),
  ).catch(() => {
    // storage full or unavailable — the in-memory thread is still fine
  });
}

let hydration: Promise<void> | null = null;

/** Restore the stored thread once per app session. Safe to call repeatedly. */
export function hydrate(): Promise<void> {
  if (!hydration) {
    hydration = (async () => {
      let restored: ChatMessage[] = [];
      try {
        const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isStoredEnvelope(parsed)) restored = sanitise(parsed.messages);
        }
      } catch {
        // corrupt payload or storage unavailable — start fresh
      }
      // Anything sent before the read finished stays after the restored history.
      patch({
        hydrated: true,
        messages: restored.length ? [...restored, ...state.messages] : state.messages,
      });
    })();
  }
  return hydration;
}

function isStoredEnvelope(value: unknown): value is { v: 1; messages: unknown[] } {
  if (typeof value !== 'object' || value === null) return false;
  const envelope = value as { v?: unknown; messages?: unknown };
  return envelope.v === 1 && Array.isArray(envelope.messages);
}

function sanitise(list: unknown[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  list.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return;
    const m = item as Partial<ChatMessage>;
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return;
    out.push({
      id: typeof m.id === 'string' ? m.id : `${m.role[0]}-restored-${index}`,
      role: m.role,
      content: m.content,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : undefined,
      builders: Array.isArray(m.builders) ? m.builders : undefined,
      searchParams:
        typeof m.searchParams === 'object' && m.searchParams !== null ? m.searchParams : undefined,
    });
  });
  return out;
}

/* ── Actions ──────────────────────────────────────────────────────── */

/**
 * Append the user's message and fetch the assistant reply. No consent gate here —
 * surfaces call `useChat().sendMessage`, which runs the disclosure first.
 */
async function sendMessageRaw(text: string): Promise<void> {
  const content = text.trim();
  if (!content || state.loading) return;

  const userMessage: ChatMessage = {
    id: `u-${Date.now()}`,
    role: 'user',
    content,
    timestamp: Date.now(),
  };
  const thread = [...state.messages, userMessage];
  const context = thread
    .slice(-CONTEXT_LIMIT)
    .map((m) => ({ role: m.role, content: m.content.slice(0, CONTENT_LIMIT) }));

  patch({ messages: thread, input: '', error: null, loading: true });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      patch({ error: ERROR_SIGN_IN, loading: false });
      return;
    }

    const { data, error } = await supabase.functions.invoke<AiChatReply>('ai-chat', {
      body: { messages: context },
    });

    if (error) {
      const status =
        error instanceof FunctionsHttpError
          ? (error.context as { status?: number } | undefined)?.status
          : undefined;
      patch({
        error:
          status === 401 ? ERROR_SIGN_IN : status === 429 ? ERROR_RATE_LIMITED : ERROR_GENERIC,
        loading: false,
      });
      return;
    }

    if (typeof data?.reply !== 'string') {
      patch({ error: ERROR_GENERIC, loading: false });
      return;
    }

    patch({
      messages: [
        ...state.messages,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          builders: data.builders ?? undefined,
          searchParams: data.searchParams ?? undefined,
          timestamp: Date.now(),
        },
      ],
      loading: false,
    });
  } catch {
    patch({ error: ERROR_GENERIC, loading: false });
  }
}

/** Web semantics: drop the last user message and send it again. */
function retry() {
  const lastUser = [...state.messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return;
  patch({ messages: state.messages.filter((m) => m !== lastUser), error: null });
  void sendMessageRaw(lastUser.content);
}

function clear() {
  patch({ messages: [], error: null });
}

function setInput(input: string) {
  if (input !== state.input) patch({ input });
}

function openPanel() {
  if (!state.panelOpen) patch({ panelOpen: true });
}

function closePanel() {
  if (state.panelOpen) patch({ panelOpen: false });
}

/* ── Hook + provider ──────────────────────────────────────────────── */

export interface ChatContextValue extends ChatState {
  setInput: (value: string) => void;
  /** Consent-gated send — shows the AI disclosure first on a fresh install. */
  sendMessage: (text: string) => Promise<void>;
  retry: () => void;
  clear: () => void;
  openPanel: () => void;
  closePanel: () => void;
  /** Render this once in the surface that calls `sendMessage`. */
  consentModal: ReactNode;
}

export function useChat(): ChatContextValue {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { ensureConsent, consentModal } = useAiConsent();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || state.loading) return;
      // First-run disclosure: the text is sent to Anthropic (third-party AI).
      if (!(await ensureConsent())) return;
      await sendMessageRaw(text);
    },
    [ensureConsent],
  );

  return {
    ...snapshot,
    setInput,
    sendMessage,
    retry,
    clear,
    openPanel,
    closePanel,
    consentModal,
  };
}

/**
 * Passthrough kept for parity with the web tree. State is module-level, so this
 * only warms the stored thread — mounting it is optional.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void hydrate();
  }, []);
  return <>{children}</>;
}
