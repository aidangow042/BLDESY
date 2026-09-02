/**
 * One thread — port of ~/bldesy-web/components/messages/conversation-view.tsx.
 * Header (avatar, name, role badge, "View profile", ⋯ menu), the Annex A.3
 * first-open disclaimer, date-divided bubbles with optimistic send + Realtime,
 * `getThread(before)` paging, report / block / flag-junk, and the blocked-state
 * notice. Reads and writes go through lib/data/messages.ts (the website API).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AMBER_BOX } from '@/components/jobs/match-warning';
import { ReportModal } from '@/components/report-modal';
import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { blockUser, getBlockedIds, unblockUser } from '@/lib/blocking';
import { flagConversationJunk, getThread,
  MESSAGES_PAGE_SIZE,
  sendMessage,
  sendMessageErrorMessage,
  type Message,
  type OtherUser,
} from '@/lib/data/messages';
import { ROUTES } from '@/lib/routes';
import { db } from '@/lib/supabase';
import { roleBadgeLabel } from './conversation-list';
import { CustomerProfileModal } from './customer-profile-modal';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';

const A3_STORAGE_PREFIX = 'bldesy_a3_seen_';

export function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/** Builder profile takes precedence when a user holds both extension rows. */
function profileHref(user: OtherUser): Href | null {
  if (user.is_builder) return ROUTES.builderProfile(user.id) as Href;
  if (user.is_enterprise) return ROUTES.companyProfile(user.id) as Href;
  return null;
}

interface ConversationViewProps {
  conversationId: string;
  otherUser: OtherUser;
  onBack?: () => void;
  /** Distance from the window top to this view — for the keyboard avoider. */
  keyboardVerticalOffset?: number;
  /** Safe-area padding under the composer. */
  bottomInset?: number;
}

export function ConversationView({
  conversationId,
  otherUser,
  onBack,
  keyboardVerticalOffset = 0,
  bottomInset = 0,
}: ConversationViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const amber = AMBER_BOX[scheme];
  const router = useRouter();
  const toast = useToast();
  const { user } = useUser();
  const uid = user?.id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Customers have no public profile page — "View profile" opens a popup
  // with their trust profile instead (RLS-gated server-side).
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const isCustomer = !otherUser.is_builder && !otherUser.is_enterprise;
  const [showA3Banner, setShowA3Banner] = useState(false);

  // Online Safety Act — report + block UI. We only know our own blocks
  // (blocked_users RLS is blocker-scoped); the DB trigger still rejects
  // sends in either direction, but surfacing our own block here gives a
  // clear UX instead of a raw trigger error.
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [flagJunkBusy, setFlagJunkBusy] = useState(false);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  // Annex A.3 — show the connector-only disclaimer the first time a user
  // opens a given conversation; dismissal is remembered per conversation.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(`${A3_STORAGE_PREFIX}${conversationId}`)
      .then((seen) => {
        if (!cancelled) setShowA3Banner(!seen);
      })
      .catch(() => {
        if (!cancelled) setShowA3Banner(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  function dismissA3() {
    setShowA3Banner(false);
    AsyncStorage.setItem(`${A3_STORAGE_PREFIX}${conversationId}`, '1').catch(() => {});
  }

  // Load block status for the other participant.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getBlockedIds(uid)
      .then((ids) => {
        if (!cancelled) setIsBlocked(ids.has(otherUser.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid, otherUser.id]);

  // Load the thread (the GET also resets our unread count server-side).
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getThread(conversationId)
      .then((thread) => {
        if (!mounted) return;
        setMessages(thread.messages || []);
        setHasMore((thread.messages?.length ?? 0) >= MESSAGES_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) {
          toast.show("Couldn't load messages.", { variant: 'error' });
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Realtime
  useEffect(() => {
    if (!uid) return;
    const channel = db
      .channel(`conv-${conversationId}-${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === uid) {
            setMessages((prev) =>
              prev.some((m) => m.id === newMsg.id)
                ? prev
                : prev.map((m) => (m.id.startsWith('temp-') && m.body === newMsg.body ? newMsg : m)),
            );
            return;
          }
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          getThread(conversationId).catch(() => {
            /* mark-read best-effort */
          });
        },
      )
      .subscribe();

    return () => {
      void db.removeChannel(channel);
    };
  }, [conversationId, uid]);

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const page = await getThread(conversationId, messages[0].created_at);
      const older = page.messages || [];
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !known.has(m.id)), ...prev];
      });
      setHasMore(older.length >= MESSAGES_PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, messages]);

  async function handleSend(body: string) {
    if (!uid) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: uid,
      body,
      attachment_url: null,
      attachment_type: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      const msg = await sendMessage(conversationId, body);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: `failed-${Date.now()}`, attachment_type: 'failed' } : m,
        ),
      );
      toast.show(sendMessageErrorMessage(e), { variant: 'error' });
    }
  }

  // Value-gated billing: flag a homeowner enquiry as junk so it doesn't
  // count toward the free-enquiry meter (7-day window, enforced server-side).
  // Only offered on conversations with a Customer — that's the direction
  // that meters. Distinct from report/block: junk is a billing signal.
  async function handleFlagJunk() {
    if (!uid || flagJunkBusy) return;
    setFlagJunkBusy(true);
    setMenuOpen(false);
    try {
      await flagConversationJunk(conversationId);
      toast.show("Enquiry flagged as junk — it won't count toward your free enquiries.", { variant: 'success' });
    } catch (e) {
      toast.show(
        e instanceof ApiError && e.message ? e.message : "Couldn't flag this enquiry. Please try again.",
        { variant: 'error' },
      );
    }
    setFlagJunkBusy(false);
  }

  async function handleBlock() {
    if (!uid || blockBusy) return;
    setBlockBusy(true);
    setMenuOpen(false);
    const { error } = await blockUser(uid, otherUser.id);
    if (error) {
      toast.show("Couldn't block this user. Please try again.", { variant: 'error' });
    } else {
      setIsBlocked(true);
      toast.show(`${otherUser.name} blocked. They can no longer message you.`, { variant: 'success' });
    }
    setBlockBusy(false);
  }

  async function handleUnblock() {
    if (!uid || blockBusy) return;
    setBlockBusy(true);
    setMenuOpen(false);
    const { error } = await unblockUser(uid, otherUser.id);
    if (error) {
      toast.show("Couldn't unblock this user. Please try again.", { variant: 'error' });
    } else {
      setIsBlocked(false);
      toast.show(`${otherUser.name} unblocked.`, { variant: 'success' });
    }
    setBlockBusy(false);
  }

  function openProfile() {
    if (isCustomer) {
      setProfileModalOpen(true);
      return;
    }
    const href = profileHref(otherUser);
    if (href) router.push(href);
  }

  // Newest first for the inverted list; a divider sits above the first
  // message of each day (in chronological terms: the older neighbour differs).
  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {/* ── Chat header ────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: c.canvas, borderColor: c.border + '99' }]}
            accessibilityRole="button"
            accessibilityLabel="Back to conversations"
          >
            <MaterialIcons name="chevron-left" size={24} color={c.textPrimary} />
          </Pressable>
        ) : null}
        <View style={[styles.avatar, { backgroundColor: c.primary + '1A' }]}>
          {otherUser.avatar_url ? (
            <Image
              source={{ uri: otherUser.avatar_url }}
              accessibilityLabel={`${otherUser.name}'s avatar`}
              contentFit="cover"
              cachePolicy="disk"
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarInitial, { color: c.primary }]}>
              {(otherUser.name || '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Pressable onPress={openProfile} style={styles.nameBtn} accessibilityRole="link">
              <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
                {otherUser.name}
              </Text>
            </Pressable>
            <View style={[styles.roleBadge, { backgroundColor: c.primaryBg }]}>
              <Text style={[styles.roleBadgeText, { color: c.primary }]}>
                {roleBadgeLabel(otherUser).toUpperCase()}
              </Text>
            </View>
          </View>
          <Pressable onPress={openProfile} accessibilityRole="link">
            <Text style={[styles.viewProfile, { color: c.textSecondary }]}>View profile</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={styles.menuBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Conversation options"
        >
          <MaterialIcons name="more-vert" size={22} color={c.textSecondary} />
        </Pressable>
      </View>

      {/* Overflow menu: flag junk / report / block */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)} accessibilityLabel="Close menu">
          <View
            style={[
              styles.menuSheet,
              Shadows.lg,
              { backgroundColor: c.surface, borderColor: c.border, paddingBottom: Spacing.md + bottomInset },
            ]}
            accessibilityRole="menu"
          >
            {isCustomer ? (
              <Pressable
                onPress={handleFlagJunk}
                disabled={flagJunkBusy}
                style={[styles.menuItem, flagJunkBusy && styles.dim]}
                accessibilityRole="menuitem"
              >
                <MaterialIcons name="outlined-flag" size={18} color={c.textSecondary} />
                <Text style={[styles.menuItemText, { color: c.textPrimary }]}>Flag enquiry as junk</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              style={styles.menuItem}
              accessibilityRole="menuitem"
            >
              <MaterialIcons name="flag" size={18} color={c.textSecondary} />
              <Text style={[styles.menuItemText, { color: c.textPrimary }]}>Report user</Text>
            </Pressable>
            <Pressable
              onPress={isBlocked ? handleUnblock : handleBlock}
              disabled={blockBusy}
              style={[styles.menuItem, blockBusy && styles.dim]}
              accessibilityRole="menuitem"
            >
              <MaterialIcons name="block" size={18} color={c.error} />
              <Text style={[styles.menuItemText, { color: c.error }]}>
                {isBlocked ? 'Unblock user' : 'Block user'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        contentType="user"
        reportedUserId={otherUser.id}
        onSubmitted={(didBlock) => {
          setReportOpen(false);
          if (didBlock) setIsBlocked(true);
          toast.show(
            didBlock
              ? 'Report submitted and user blocked — our team will review it.'
              : 'Report submitted — our team will review it.',
            { variant: 'success', duration: 4000 },
          );
        }}
      />

      <CustomerProfileModal
        visible={profileModalOpen}
        customerId={otherUser.id}
        customerName={otherUser.name}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Annex A.3 — first-message disclaimer (dismissable, per-conversation) */}
      {showA3Banner ? (
        <View style={[styles.a3, { backgroundColor: amber.bg, borderBottomColor: amber.border }]}>
          <MaterialIcons name="warning-amber" size={20} color={amber.icon} style={styles.a3Icon} />
          <Text style={[styles.a3Text, { color: amber.text }]}>
            <Text style={styles.a3Strong}>Before you message.</Text> You&apos;re contacting an
            independent business, not BLDESY. We don&apos;t verify everything users say about
            themselves. Confirm their licence and ABN with the official registers before any work or
            payments.
          </Text>
          <Pressable
            onPress={dismissA3}
            hitSlop={8}
            style={styles.a3Close}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notice"
          >
            <MaterialIcons name="close" size={16} color={amber.icon} />
          </Pressable>
        </View>
      ) : null}

      {/* ── Messages area ──────────────────────────────────────── */}
      {loading ? (
        <View style={[styles.center, { backgroundColor: c.canvas }]}>
          <ActivityIndicator color={c.primary} accessibilityLabel="Loading messages" />
        </View>
      ) : messages.length === 0 ? (
        <View style={[styles.center, { backgroundColor: c.canvas }]}>
          <View style={[styles.emptyDisc, { backgroundColor: c.primary + '1A' }]}>
            <MaterialIcons name="chat-bubble-outline" size={24} color={c.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No messages yet</Text>
          <Text style={[styles.emptyBody, { color: c.textSecondary }]}>Say hello to start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          data={ordered}
          inverted
          keyExtractor={(m) => m.id}
          style={{ backgroundColor: c.canvas }}
          contentContainerStyle={styles.messagesList}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={c.primary} style={styles.loadingMore} /> : null
          }
          renderItem={({ item, index }) => {
            const older = ordered[index + 1];
            const showDivider =
              !older ||
              new Date(older.created_at).toDateString() !== new Date(item.created_at).toDateString();
            return (
              <View>
                {showDivider ? (
                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
                    <View style={[styles.dividerPill, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <Text style={[styles.dividerText, { color: c.textSecondary }]}>
                        {formatDateDivider(item.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
                  </View>
                ) : null}
                <MessageBubble
                  body={item.body}
                  isSender={item.sender_id === uid}
                  timestamp={item.created_at}
                  attachmentUrl={item.attachment_url}
                  attachmentType={item.attachment_type}
                />
              </View>
            );
          }}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* ── Input bar ──────────────────────────────────────────── */}
      {isBlocked ? (
        <View
          style={[
            styles.blockedBar,
            { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Spacing.md + bottomInset },
          ]}
        >
          <Text style={[styles.blockedText, { color: c.textSecondary }]}>
            You&apos;ve blocked {otherUser.name}. Unblock them to send messages.
          </Text>
          <Pressable
            onPress={handleUnblock}
            disabled={blockBusy}
            style={[styles.unblockBtn, { borderColor: c.border }, blockBusy && styles.dim]}
            accessibilityRole="button"
          >
            <Text style={[styles.unblockText, { color: c.textPrimary }]}>Unblock</Text>
          </Pressable>
        </View>
      ) : (
        <MessageInput onSend={handleSend} bottomInset={bottomInset} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarInitial: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  headerText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameBtn: { flexShrink: 1, minWidth: 0 },
  name: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  roleBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.5 },
  viewProfile: { fontSize: 11, fontFamily: FontFamily.body, marginTop: 2 },
  menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menuSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: Radius.lg,
  },
  menuItemText: { fontSize: 14, fontFamily: FontFamily.body },
  dim: { opacity: 0.5 },
  a3: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  a3Icon: { marginTop: 2 },
  a3Text: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  a3Strong: { fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  a3Close: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  emptyDisc: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  emptyBody: { marginTop: 2, fontSize: 12, fontFamily: FontFamily.body },
  messagesList: { paddingVertical: Spacing.lg },
  loadingMore: { paddingVertical: Spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerPill: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  dividerText: { fontSize: 11, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  blockedBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 14,
  },
  blockedText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  unblockBtn: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  unblockText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
