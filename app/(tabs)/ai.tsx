/**
 * AI Assist tab. Mirrors `~/bldesy-web/app/ai/page.tsx`: the global AppHeader
 * stays above (as the site header does on the web), then the gradient
 * <ChatHeader> and the shared <ChatThread> — one conversation with the floating
 * AI Assist panel (`components/ai/chat-provider.tsx`). Guests get the
 * <SignInGate>. The launcher is hidden here (`hideAssist`).
 */
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { ChatHeader, ChatThread, SignInGate, useChat } from '@/components/ai';
import { AppShell } from '@/components/layout';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';

export default function AiScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { authedUser, loading: authLoading } = useUser();
  const { messages, clear } = useChat();

  return (
    <AppShell hideAssist background={c.canvas}>
      {!authLoading && !authedUser ? (
        <View style={styles.gate}>
          <SignInGate />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.root}
        >
          <ChatHeader hasMessages={messages.length > 0} onClear={clear} />
          <ChatThread />
        </KeyboardAvoidingView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
