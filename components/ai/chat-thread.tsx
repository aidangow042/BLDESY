/**
 * ChatThread — the shared conversation surface: messages plus the input bar,
 * wired to the shared thread in `chat-provider.tsx`. Mirrors web
 * `components/ai/chat-thread.tsx`. Rendered by both the /ai tab and the AI
 * Assist panel; parents must be a bounded-height flex column.
 */
import { useUser } from '@/lib/auth-context';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { useChat } from './chat-provider';

export function ChatThread() {
  const { authedUser, loading: authLoading } = useUser();
  const { messages, input, loading, error, setInput, sendMessage, retry, consentModal } = useChat();

  return (
    <>
      <ChatMessages
        messages={messages}
        loading={loading}
        error={error}
        onSendMessage={sendMessage}
        onRetry={retry}
      />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => sendMessage(input)}
        disabled={loading || (!authedUser && !authLoading)}
        loading={loading}
      />
      {consentModal}
    </>
  );
}
