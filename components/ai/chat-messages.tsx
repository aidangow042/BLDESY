/**
 * ChatMessages — scrollable message list. Mirrors web `components/ai/chat-messages.tsx`:
 *   • Welcome state with sparkle hero + 4 trade-coloured suggestion cards
 *   • User bubbles right-aligned (primary bg, white text)
 *   • Assistant bubbles left-aligned (surface bg) with sparkle avatar
 *   • Builder recommendation cards rendered below assistant messages
 *   • Animated typing indicator with three pulsing dots
 *   • Error banner with retry
 */

import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ReportModal } from '@/components/report-modal';
import { useToast } from '@/components/ui';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ChatMessage } from './types';
import { Colors, FontFamily, Radius, Shadows, Spacing, tradeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Suggestion {
  text: string;
  tradeSlug: string;
}

const SUGGESTIONS: Suggestion[] = [
  { text: 'Find a plumber nearby',          tradeSlug: 'plumber' },
  { text: 'Help me describe my renovation', tradeSlug: 'builder' },
  { text: 'What trade do I need for my job?', tradeSlug: 'electrician' },
  { text: 'Compare quotes for kitchen remodel', tradeSlug: 'painter' },
];

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSendMessage: (text: string) => void;
  onRetry: () => void;
}

export function ChatMessages({
  messages,
  loading,
  error,
  onSendMessage,
  onRetry,
}: ChatMessagesProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const toast = useToast();
  // Which AI response (if any) is being reported.
  const [reportText, setReportText] = useState<string | null>(null);

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, loading]);

  const isEmpty = messages.length === 0 && !loading;

  return (
    <>
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Welcome state */}
      {isEmpty ? (
        <View style={styles.welcome}>
          <View
            style={[
              styles.welcomeIcon,
              {
                backgroundColor: c.primaryBg,
                borderColor: c.primary + '20',
              },
            ]}
          >
            <Text style={[styles.welcomeSparkle, { color: c.primary }]}>✦</Text>
          </View>
          <Text style={[styles.welcomeTitle, { color: c.textPrimary }]}>
            G&apos;day! How can I help?
          </Text>
          <Text style={[styles.welcomeCopy, { color: c.textSecondary }]}>
            I can help you find tradies, estimate costs, or describe what work you need done. Just ask!
          </Text>

          <View style={styles.suggestionGrid}>
            {SUGGESTIONS.map((s) => {
              const tone = tradeColors(s.tradeSlug, scheme);
              return (
                <Pressable
                  key={s.text}
                  onPress={() => onSendMessage(s.text)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    {
                      backgroundColor: tone.bg,
                      borderColor: tone.tint + '33',
                    },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text style={[styles.suggestionText, { color: tone.tint }]}>
                    {s.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Message list */}
      {messages.map((msg) => (
        <View key={msg.id} style={styles.msgWrap}>
          <View
            style={[
              styles.msgRow,
              msg.role === 'user' ? styles.msgRight : styles.msgLeft,
            ]}
          >
            {msg.role === 'assistant' ? (
              <View
                style={[
                  styles.aiAvatar,
                  {
                    backgroundColor: c.primaryBg,
                    borderColor: c.primary + '20',
                  },
                ]}
              >
                <Text style={[styles.aiAvatarSparkle, { color: c.primary }]}>✦</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.bubble,
                msg.role === 'user'
                  ? { backgroundColor: c.primary, borderBottomRightRadius: 4 }
                  : { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderBottomLeftRadius: 4 },
                Shadows.sm,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: msg.role === 'user' ? '#ffffff' : c.textPrimary },
                ]}
              >
                {msg.content}
              </Text>
            </View>
          </View>

          {/* AI-generated label + report (assistant messages only) */}
          {msg.role === 'assistant' ? (
            <View style={styles.aiFooter}>
              <Text style={[styles.aiLabel, { color: c.textSecondary }]}>✦ AI-generated</Text>
              <Text style={[styles.aiDot, { color: c.textSecondary }]}>·</Text>
              <Pressable
                onPress={() => setReportText(msg.content)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Report this AI response"
              >
                <View style={styles.aiReportRow}>
                  <Ionicons name="flag-outline" size={12} color={c.textSecondary} />
                  <Text style={[styles.aiLabel, { color: c.textSecondary }]}>Report</Text>
                </View>
              </Pressable>
            </View>
          ) : null}

          {/* Builder recommendation cards */}
          {msg.role === 'assistant' && msg.builders && msg.builders.length > 0 ? (
            <View style={styles.builderList}>
              {msg.builders.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => router.push(`/builder-profile?id=${b.id}` as any)}
                  style={({ pressed }) => [
                    styles.builderCard,
                    { backgroundColor: c.surface, borderColor: c.border },
                    Shadows.sm,
                    pressed && { transform: [{ scale: 0.99 }] },
                  ]}
                >
                  {b.profile_photo_url ? (
                    <Image source={{ uri: b.profile_photo_url }} style={styles.builderAvatar} />
                  ) : (
                    <View style={[styles.builderAvatar, { backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={styles.builderInitial}>{b.business_name[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.builderName, { color: c.textPrimary }]} numberOfLines={1}>
                      {b.business_name}
                    </Text>
                    <View style={styles.builderMeta}>
                      <View style={[styles.tradeChip, { backgroundColor: c.primaryBg }]}>
                        <Text style={[styles.tradeChipText, { color: c.primary }]}>{b.trade_category}</Text>
                      </View>
                      <Text style={[styles.builderLocation, { color: c.textSecondary }]} numberOfLines={1}>
                        {b.suburb}
                        {b.postcode ? ` ${b.postcode}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
                </Pressable>
              ))}
              {msg.searchParams ? (
                <Pressable
                  onPress={() => {
                    const sp = new URLSearchParams();
                    if (msg.searchParams?.trade_category) sp.set('trade', msg.searchParams.trade_category);
                    if (msg.searchParams?.suburb) sp.set('location', msg.searchParams.suburb);
                    if (msg.searchParams?.urgency) sp.set('urgency', msg.searchParams.urgency);
                    router.push(`/results?${sp.toString()}` as any);
                  }}
                  style={[styles.viewAllPill, { backgroundColor: c.primaryBg }]}
                >
                  <Text style={[styles.viewAllText, { color: c.primary }]}>View all results →</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

      {/* Typing indicator */}
      {loading ? <TypingIndicator /> : null}

      {/* Error banner */}
      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: c.error + '0D', borderColor: c.error + '26' }]}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
          {messages.length > 0 ? (
            <Pressable onPress={onRetry} style={{ marginTop: 4 }}>
              <Text style={[styles.retry, { color: c.error }]}>↻ Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>

      <ReportModal
        visible={reportText !== null}
        onClose={() => setReportText(null)}
        contentType="ai_response"
        allowBlock={false}
        prefillDetail={reportText ?? undefined}
        onSubmitted={() => {
          setReportText(null);
          toast.show('Thanks — we\'ll review this response.', { variant: 'success', duration: 4000 });
        }}
      />
    </>
  );
}

/* ── Typing indicator ─────────────────────────────────────────────── */

function TypingIndicator() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.msgRow, styles.msgLeft]}>
      <View
        style={[
          styles.aiAvatar,
          {
            backgroundColor: c.primaryBg,
            borderColor: c.primary + '20',
          },
        ]}
      >
        <Text style={[styles.aiAvatarSparkle, { color: c.primary }]}>✦</Text>
      </View>
      <View
        style={[
          styles.bubble,
          { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, flexDirection: 'row', gap: 6, paddingVertical: 14 },
        ]}
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay, easing: Easing.linear }),
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [delay, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + t.value * 0.7,
    transform: [{ translateY: -t.value * 4 }],
  }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary + '99' },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },

  /* Welcome state */
  welcome: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  welcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  welcomeSparkle: {
    fontSize: 32,
  },
  welcomeTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  welcomeCopy: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 480,
  },
  suggestion: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  suggestionText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
  },

  /* Message list */
  msgWrap: {
    gap: Spacing.sm,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  msgLeft: {
    justifyContent: 'flex-start',
  },
  msgRight: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarSparkle: {
    fontSize: 13,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  aiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 36,
    marginTop: 2,
  },
  aiReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  aiLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  aiDot: {
    fontSize: 11,
  },

  /* Builder recs */
  builderList: {
    paddingLeft: 36,
    gap: Spacing.sm,
  },
  builderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 12,
  },
  builderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  builderInitial: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
  builderName: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 13,
  },
  builderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tradeChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tradeChipText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  builderLocation: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    flex: 1,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
  },
  viewAllPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  viewAllText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },

  /* Error */
  errorBanner: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    maxWidth: 320,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
    textAlign: 'center',
  },
  retry: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
});
