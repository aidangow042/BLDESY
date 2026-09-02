/**
 * The shared inbox — port of ~/bldesy-web/components/messages/inbox.tsx.
 * One component behind both surfaces:
 *   /messages          shared page (homeowners; role detected)
 *   /portal/messages   tradie portal shell (role forced)
 * `?c=` keeps the open conversation in the route params so deep links from
 * "Send a Message" and push notifications land on the right thread.
 * Reads only through lib/data/messages.ts (the website API).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoles, useUser } from '@/lib/auth-context';
import { CONVERSATIONS_LOAD_ERROR, listConversations, type Conversation } from '@/lib/data/messages';
import { ROUTES } from '@/lib/routes';
import { ConversationList } from './conversation-list';
import { ConversationView } from './conversation-view';
import { EmptyInbox } from './empty-inbox';
import type { MessagesBasePath } from './send-message-button';

const POLL_MS = 10_000;

export function Inbox({
  basePath,
  forceRole,
  keyboardVerticalOffset = 0,
  bottomInset,
}: {
  basePath: MessagesBasePath;
  forceRole?: 'tradie' | 'customer';
  /** Distance from the window top to the inbox (keyboard avoidance in a thread). */
  keyboardVerticalOffset?: number;
  /** Padding under the composer / list; defaults to the bottom safe area (pass 0 inside a tab bar). */
  bottomInset?: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const bottom = bottomInset ?? insets.bottom;
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useUser();
  const params = useLocalSearchParams<{ c?: string }>();
  const activeConvoId = params.c ? String(params.c) : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  // Role signal for the empty state only — from the shared RolesProvider.
  const { isTradie } = useRoles();
  const role = forceRole ?? (isTradie ? 'tradie' : 'customer');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(ROUTES.login as Href);
    }
  }, [user, authLoading, router]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await listConversations();
      if (mountedRef.current) setConversations(data);
    } catch {
      toast.show(CONVERSATIONS_LOAD_ERROR, { variant: 'error' });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (user) void fetchConversations();
  }, [user, fetchConversations]);

  // The website re-polls every 10s while the tab is visible.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void fetchConversations();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fetchConversations();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [user, fetchConversations]);

  function selectConversation(id: string) {
    router.setParams({ c: id });
    setConversations((prev) => prev.map((conv) => (conv.id === id ? { ...conv, unread_count: 0 } : conv)));
  }

  function handleBack() {
    router.setParams({ c: '' });
    void fetchConversations();
  }

  const activeConvo = conversations.find((conv) => conv.id === activeConvoId);

  if (authLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (activeConvoId) {
    if (activeConvo) {
      return (
        <ConversationView
          key={activeConvo.id}
          conversationId={activeConvo.id}
          otherUser={activeConvo.other_user}
          onBack={handleBack}
          keyboardVerticalOffset={keyboardVerticalOffset}
          bottomInset={bottom}
        />
      );
    }
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      );
    }
    // Unknown / no-longer-visible conversation — fall through to the list.
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return <EmptyInbox role={role} />;
  }

  return (
    <ConversationList
      conversations={conversations}
      activeId={activeConvoId}
      onSelect={selectConversation}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void fetchConversations();
      }}
      bottomInset={bottom}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
});
