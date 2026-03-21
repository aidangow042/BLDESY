import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSearchHistory, addSearchEntry, type SearchEntry } from '@/lib/search-history';
import auLocations from '@/lib/au-locations.json';

/* ───────────────────────── Constants ───────────────────────── */

const BRAND = '#0D7C66';
const BRAND_DARK = '#0A6B58';
const BRAND_LIGHT = '#E8F5F3';

/* ───────────────────────── Reverse geocode suburb from coords ───────────────────────── */

const localities: Record<string, [number, number]> = (auLocations as any).l;

function reverseGeocodeSuburb(lat: number, lon: number): string | null {
  let closest: string | null = null;
  let bestDist = Infinity;
  for (const [name, coords] of Object.entries(localities)) {
    const dLat = coords[0] - lat;
    const dLon = coords[1] - lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      closest = name;
    }
  }
  // Capitalise suburb name
  if (closest) return closest.replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}

/* ───────────────────────── Build dynamic suggestions ───────────────────────── */

const FALLBACK_PROMPTS = [
  'Find a plumber nearby',
  'How much does a bathroom reno cost?',
  'I need an electrician ASAP',
  'What questions should I ask a builder?',
];

function buildWelcomePrompts(suburb: string | null, history: SearchEntry[]): string[] {
  const prompts: string[] = [];

  // From search history — reword recent trades
  for (const entry of history.slice(0, 2)) {
    const loc = entry.location ?? suburb;
    if (loc) {
      prompts.push(`Find a ${entry.trade} in ${loc}`);
    } else {
      prompts.push(`Find a ${entry.trade} nearby`);
    }
  }

  // Location-based if we have a suburb and need more
  if (suburb && prompts.length < 4) {
    const already = prompts.map((p) => p.toLowerCase());
    const locationBased = [
      `Find a plumber in ${suburb}`,
      `Best electrician in ${suburb}`,
      `Need a carpenter in ${suburb}`,
    ];
    for (const p of locationBased) {
      if (prompts.length >= 4) break;
      if (!already.includes(p.toLowerCase())) prompts.push(p);
    }
  }

  // Fill remaining with generic (non-trade-specific) prompts
  const generic = [
    'How much does a bathroom reno cost?',
    'What questions should I ask a builder?',
    'How do I choose the right tradie?',
  ];
  for (const g of generic) {
    if (prompts.length >= 4) break;
    prompts.push(g);
  }

  return prompts;
}

function buildQuickReplies(suburb: string | null, lastMessage: Message | null): string[] {
  const chips: string[] = [];

  // Contextual based on last AI message content
  if (lastMessage?.content) {
    const text = lastMessage.content.toLowerCase();
    if (text.includes('cost') || text.includes('price') || text.includes('$')) {
      chips.push('Is that a fair price?');
    }
    if (text.includes('plumber') || text.includes('electrician') || text.includes('tradie')) {
      chips.push(suburb ? `Show me builders in ${suburb}` : 'Show me builders nearby');
    }
  }

  // Always offer these if we have room
  if (chips.length < 3) chips.push('What will this cost?');
  if (chips.length < 3) chips.push('Tell me more');
  if (chips.length < 3) chips.push(suburb ? `Find tradies in ${suburb}` : 'Find tradies nearby');

  return chips.slice(0, 3);
}

/* ───────────────────────── Types ───────────────────────── */

type BuilderRec = {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode: string;
  bio: string | null;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  builders?: BuilderRec[];
  searchParams?: Record<string, string>;
};

/* ───────────────────────── Typing Indicator ───────────────────────── */

function TypingIndicator({ isDark }: { isDark: boolean }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.typingRow}>
      <View style={[styles.aiAvatar, { backgroundColor: isDark ? '#134E4A' : BRAND_LIGHT }]}>
        <MaterialIcons name="auto-awesome" size={14} color={BRAND} />
      </View>
      <View style={[styles.typingBubble, { backgroundColor: isDark ? '#1e293b' : '#F0F1F3' }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { backgroundColor: isDark ? '#94a3b8' : '#6B7280' }, dotStyle(dot)]}
          />
        ))}
      </View>
    </View>
  );
}

/* ───────────────────────── Animated Message ───────────────────────── */

function AnimatedMessage({ children }: { children: React.ReactNode }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

/* ───────────────────────── Simple Markdown Renderer ───────────────────────── */

function renderFormattedText(text: string, textColor: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Skip empty lines, just add a small spacer
    if (line.trim() === '') {
      if (lineIndex > 0) elements.push(<View key={`sp-${lineIndex}`} style={{ height: 6 }} />);
      return;
    }

    const isBullet = /^[\-\*•]\s/.test(line.trim());
    const bulletText = isBullet ? line.trim().replace(/^[\-\*•]\s/, '') : line;

    const parts = bulletText.split(/(\*\*[^*]+\*\*)/g);
    const inlineElements = parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return (
          <ThemedText key={i} style={[styles.messageText, { color: textColor, fontWeight: '700' }]}>
            {boldMatch[1]}
          </ThemedText>
        );
      }
      return (
        <ThemedText key={i} style={[styles.messageText, { color: textColor }]}>
          {part}
        </ThemedText>
      );
    });

    if (isBullet) {
      elements.push(
        <View key={`line-${lineIndex}`} style={styles.bulletRow}>
          <ThemedText style={[styles.bulletDot, { color: textColor }]}>{'\u2022'}</ThemedText>
          <ThemedText style={[styles.messageText, { color: textColor, flex: 1 }]}>
            {inlineElements}
          </ThemedText>
        </View>,
      );
    } else {
      elements.push(
        <ThemedText key={`line-${lineIndex}`} style={[styles.messageText, { color: textColor }]}>
          {inlineElements}
        </ThemedText>,
      );
    }
  });

  return <View>{elements}</View>;
}

/* ───────────────────────── Quick Reply Chips ───────────────────────── */

function QuickReplies({
  isDark,
  chips,
  onPress,
}: {
  isDark: boolean;
  chips: string[];
  onPress: (text: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.quickRepliesScroll}
      contentContainerStyle={styles.quickRepliesContent}
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((chip) => (
        <Pressable
          key={chip}
          style={({ pressed }) => [
            styles.quickReplyChip,
            { backgroundColor: isDark ? '#134E4A' : BRAND_LIGHT },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onPress(chip)}
          accessibilityRole="button"
          accessibilityLabel={chip}
        >
          <ThemedText style={[styles.quickReplyText, { color: BRAND }]}>{chip}</ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ───────────────────────── New Conversation Pill ───────────────────────── */

function NewConversationPill({ isDark }: { isDark: boolean }) {
  return (
    <View style={styles.newConvPillWrapper}>
      <View style={[styles.newConvPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <MaterialIcons name="auto-awesome" size={12} color={isDark ? '#94a3b8' : '#6B7280'} />
        <ThemedText style={[styles.newConvText, { color: isDark ? '#94a3b8' : '#6B7280' }]}>
          New conversation
        </ThemedText>
      </View>
    </View>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */

export default function AIAssistScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const [suburb, setSuburb] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [welcomePrompts, setWelcomePrompts] = useState<string[]>(FALLBACK_PROMPTS);

  const hasMessages = messages.length > 0;

  // Offset: just enough so the input docks right above the keyboard.
  // The tab bar sits behind the keyboard, so no extra offset needed.
  const kbVerticalOffset = 0;

  /* ── Load location + search history on mount ── */
  useEffect(() => {
    (async () => {
      // Load search history
      const h = await getSearchHistory();
      setHistory(h);

      // Get device location → reverse geocode to suburb
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const s = reverseGeocodeSuburb(pos.coords.latitude, pos.coords.longitude);
          if (s) setSuburb(s);
          setWelcomePrompts(buildWelcomePrompts(s, h));
        } else {
          setWelcomePrompts(buildWelcomePrompts(null, h));
        }
      } catch {
        setWelcomePrompts(buildWelcomePrompts(null, h));
      }
    })();
  }, []);

  /* ── Send message ── */
  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    if (!text) setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: updated.map((m) => ({ role: m.role, content: m.content })),
          }),
        },
      );

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const data = await response.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
        builders: data.builders,
        searchParams: data.searchParams,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Persist search to history and refresh welcome prompts
      if (data.searchParams?.trade_category) {
        addSearchEntry(data.searchParams.trade_category, data.searchParams.suburb ?? suburb);
        const h = await getSearchHistory();
        setHistory(h);
        setWelcomePrompts(buildWelcomePrompts(suburb, h));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  /* ── Time label ── */
  function getTimeLabel(ts: number) {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'pm' : 'am';
    return `${h % 12 || 12}:${m} ${ampm}`;
  }

  /* ── Should show timestamp ── */
  function shouldShowTime(index: number) {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const curr = messages[index];
    return curr.timestamp - prev.timestamp > 60000 || prev.role !== curr.role;
  }

  const router = useRouter();

  /* ── Render message ── */
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const showTime = shouldShowTime(index);
    const hasBuilders = !isUser && item.builders && item.builders.length > 0;
    // Show quick-reply chips only after the last assistant message when not loading
    const isLastAssistant = !isUser && index === messages.length - 1 && !loading;

    return (
      <AnimatedMessage>
        {showTime && (
          <ThemedText style={[styles.timestamp, { color: isDark ? '#64748b' : '#9CA3AF' }]}>
            {getTimeLabel(item.timestamp)}
          </ThemedText>
        )}
        <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
          {!isUser && (
            <View style={[styles.aiAvatar, { backgroundColor: isDark ? '#134E4A' : BRAND_LIGHT }]}>
              <MaterialIcons name="auto-awesome" size={14} color={BRAND} />
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.bubbleUser, { backgroundColor: BRAND }]
                : [styles.bubbleAssistant, { backgroundColor: isDark ? '#1e293b' : '#F0F1F3' }],
            ]}
          >
            {isUser ? (
              <ThemedText style={[styles.messageText, { color: '#FFFFFF' }]}>{item.content}</ThemedText>
            ) : (
              renderFormattedText(item.content, isDark ? '#f1f5f9' : '#1A1A2E')
            )}
          </View>
        </View>

        {/* Builder recommendation cards */}
        {hasBuilders && (
          <View style={styles.builderRecsContainer}>
            {item.builders!.map((b) => (
              <Pressable
                key={b.id}
                style={({ pressed }) => [
                  styles.builderCard,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E5E9',
                  },
                  pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => router.push({ pathname: '/builder-profile', params: { id: b.id } })}
              >
                <View style={[styles.builderCardIcon, { backgroundColor: isDark ? '#134E4A' : BRAND_LIGHT }]}>
                  <MaterialIcons name="person" size={18} color={BRAND} />
                </View>
                <View style={styles.builderCardInfo}>
                  <ThemedText style={[styles.builderCardName, { color: isDark ? '#f1f5f9' : '#1A1A2E' }]} numberOfLines={1}>
                    {b.business_name}
                  </ThemedText>
                  <ThemedText style={[styles.builderCardMeta, { color: isDark ? '#94a3b8' : '#6B7280' }]} numberOfLines={1}>
                    {b.trade_category} · {b.suburb} {b.postcode}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#475569' : '#9CA3AF'} />
              </Pressable>
            ))}

            {/* View all results link */}
            {item.searchParams && (
              <Pressable
                style={({ pressed }) => [
                  styles.viewAllButton,
                  { backgroundColor: isDark ? '#134E4A' : BRAND_LIGHT },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => router.push({ pathname: '/results', params: item.searchParams! })}
              >
                <ThemedText style={[styles.viewAllText, { color: BRAND }]}>
                  View all results
                </ThemedText>
                <Ionicons name="arrow-forward" size={14} color={BRAND} />
              </Pressable>
            )}
          </View>
        )}

        {/* Quick-reply chips after last assistant message */}
        {isLastAssistant && (
          <QuickReplies isDark={isDark} chips={buildQuickReplies(suburb, item)} onPress={sendMessage} />
        )}
      </AnimatedMessage>
    );
  }, [isDark, messages, loading, router, sendMessage]);

  /* ───────────────────────── Render ───────────────────────── */

  const hasText = input.trim().length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      {/* ── Compact Header ── */}
      <LinearGradient
        colors={isDark ? ['#134E4A', '#0D3B3B'] : [BRAND, BRAND_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.headerContent}>
          {hasMessages ? (
            <Pressable
              style={({ pressed }) => [styles.headerBackButton, pressed && { opacity: 0.6 }]}
              onPress={() => { setMessages([]); setInput(''); Keyboard.dismiss(); }}
              accessibilityRole="button"
              accessibilityLabel="New conversation"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.headerSideSpacer} />
          )}
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <ThemedText style={styles.headerTitle}>AI Assist</ThemedText>
              <MaterialIcons name="auto-awesome" size={13} color="rgba(255,255,255,0.7)" />
            </View>
            <ThemedText style={styles.headerSubtitle}>Powered by Claude</ThemedText>
          </View>
          {hasMessages ? (
            <Pressable
              style={({ pressed }) => [styles.headerBackButton, pressed && { opacity: 0.6 }]}
              onPress={() => { setMessages([]); setInput(''); Keyboard.dismiss(); }}
              accessibilityRole="button"
              accessibilityLabel="Reset conversation"
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={styles.headerSideSpacer} />
          )}
        </View>
      </LinearGradient>

      {/* ── Body — KeyboardAvoidingView handles keyboard displacement ── */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={kbVerticalOffset}
      >
        {/* ── Messages or Welcome ── */}
        {hasMessages ? (
          <FlatList
            ref={flatListRef}
            style={styles.flex1}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={<NewConversationPill isDark={isDark} />}
            ListFooterComponent={loading ? <TypingIndicator isDark={isDark} /> : null}
          />
        ) : (
          <ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.welcomeScroll}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.welcomeIconContainer, { backgroundColor: isDark ? '#134E4A' : BRAND_LIGHT }]}>
              <MaterialIcons name="construction" size={28} color={BRAND} />
            </View>
            <ThemedText style={[styles.welcomeTitle, { color: isDark ? '#f1f5f9' : '#1A1A2E' }]}>
              G'day! How can I help?
            </ThemedText>
            <ThemedText style={[styles.welcomeSubtitle, { color: isDark ? '#94a3b8' : '#6B7280' }]}>
              Ask me about finding trades, job costs, or anything building-related.
            </ThemedText>
            {/* Suggested prompt chips */}
            <View style={styles.promptChips}>
              {welcomePrompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={({ pressed }) => [
                    styles.promptChip,
                    { backgroundColor: isDark ? '#1e293b' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E5E9' },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() => sendMessage(prompt)}
                  accessibilityRole="button"
                  accessibilityLabel={prompt}
                >
                  <ThemedText style={[styles.promptChipText, { color: isDark ? '#94a3b8' : '#374151' }]}>
                    {prompt}
                  </ThemedText>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={BRAND} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ── Input Bar ── */}
        <View
          style={[
            styles.inputBarOuter,
            { backgroundColor: colors.canvas },
          ]}
        >
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: isDark ? '#1e293b' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#D1D5DB',
              },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: isDark ? '#f1f5f9' : '#1A1A2E' }]}
              placeholder="Ask me anything..."
              placeholderTextColor={isDark ? '#64748b' : '#9CA3AF'}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              blurOnSubmit={false}
              editable={!loading}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? 'kbDismiss' : undefined}
            />
            <Pressable
              onPress={() => sendMessage()}
              disabled={loading || !hasText}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: hasText ? BRAND : (isDark ? '#1e293b' : '#E8EAED') },
                pressed && hasText && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={hasText ? '#FFFFFF' : (isDark ? '#475569' : '#B0B5BC')}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Keyboard dismiss bar (iOS only) ── */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="kbDismiss">
          <View style={[styles.kbDismissBar, { backgroundColor: isDark ? '#1e293b' : '#F0F1F3' }]}>
            <Pressable
              onPress={Keyboard.dismiss}
              style={({ pressed }) => [styles.kbDismissButton, pressed && { opacity: 0.5 }]}
            >
              <Ionicons name="chevron-down" size={22} color={isDark ? '#94a3b8' : '#6B7280'} />
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },

  /* ── Header (compact) ── */
  header: {
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSideSpacer: {
    width: 36,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },

  /* ── Welcome State ── */
  welcomeScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  welcomeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  promptChips: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  /* ── Messages ── */
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 4,
    gap: 8,
    marginTop: 2,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 8,
  },

  /* ── Typing Indicator ── */
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 6,
    marginTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  /* ── Input Bar ── */
  inputBarOuter: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },

  /* ── Builder Recommendation Cards ── */
  builderRecsContainer: {
    marginLeft: 36,
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  builderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  builderCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderCardInfo: {
    flex: 1,
    gap: 1,
  },
  builderCardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  builderCardMeta: {
    fontSize: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Quick Reply Chips ── */
  quickRepliesScroll: {
    marginLeft: 36,
    marginTop: 6,
    marginBottom: 8,
  },
  quickRepliesContent: {
    gap: 6,
    paddingRight: 16,
  },
  quickReplyChip: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── New Conversation Pill ── */
  newConvPillWrapper: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  newConvPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  newConvText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* ── Keyboard dismiss bar ── */
  kbDismissBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  kbDismissButton: {
    padding: 4,
  },
});
