/**
 * AI Assist tab. Mirrors `~/bldesy-web/app/ai/page.tsx` + `components/ai/*`.
 * Three composable pieces:
 *   <ChatHeader> — gradient bar with "AI Assist" + "New chat" button
 *   <ChatMessages> — scrollable list + welcome state + suggestion cards
 *   <ChatInput>   — sticky rounded-pill input + gradient send button
 *
 * Wraps everything in <AppShell hideHeader> so the global hamburger + bottom
 * tab bar still work, but the chat owns the top chrome.
 */

import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/layout';
import { ChatHeader, ChatInput, ChatMessages, type ChatMessage } from '@/components/ai';
import { useToast } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function AiScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { userId } = useUser();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;

      if (!userId) {
        toast.show('Please sign in to use AI Assist', { variant: 'warning' });
        return;
      }

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      const next = [...messages, userMessage];
      setMessages(next);
      if (!text) setInput('');
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
          body: { messages: next.map((m) => ({ role: m.role, content: m.content })) },
        });

        if (fnError && !data?.reply) {
          throw new Error(fnError.message ?? 'Something went wrong');
        }

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          builders: data.builders ?? undefined,
          searchParams: data.searchParams ?? undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not reach the assistant.';
        if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many')) {
          setError("You're sending messages a bit fast. Wait a moment and try again.");
        } else if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('sign in')) {
          setError('Session expired. Please sign in again.');
        } else {
          setError("Couldn't reach the assistant. Check your connection.");
        }
        // Roll back the user message — they can retry without re-typing.
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, toast, userId],
  );

  const retry = useCallback(() => {
    // Re-send the last user message, if any.
    const last = [...messages].reverse().find((m) => m.role === 'user');
    if (last) {
      sendMessage(last.content);
    }
  }, [messages, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <AppShell hideHeader background={c.canvas}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ChatHeader hasMessages={messages.length > 0} onClear={clearChat} />
        <View style={styles.body}>
          <ChatMessages
            messages={messages}
            loading={loading}
            error={error}
            onSendMessage={sendMessage}
            onRetry={retry}
          />
        </View>
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          disabled={loading}
          loading={loading}
        />
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
