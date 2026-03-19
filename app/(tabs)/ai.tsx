import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  InputAccessoryView,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ───────────────────────── Constants ───────────────────────── */

const BRAND = '#0D7C66';
const BRAND_DARK = '#0A6B58';
const BRAND_LIGHT = '#E8F5F3';
const TAB_BAR_HEIGHT = 88;

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

/* ───────────────────────── Main Component ───────────────────────── */

export default function AIAssistScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbBottomPad, setKbBottomPad] = useState(0);
  const flatListRef = useRef<FlatList<Message>>(null);

  const hasMessages = messages.length > 0;

  /* ── Keyboard tracking — plain state, LayoutAnimation for smooth resize ── */
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.create(
        Platform.OS === 'ios' ? e.duration : 250,
        LayoutAnimation.Types.keyboard,
        LayoutAnimation.Properties.opacity,
      ));
      // keyboard height minus tab bar = how much we need to shrink
      setKbBottomPad(Math.max(e.endCoordinates.height - TAB_BAR_HEIGHT, 0));
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.create(
        Platform.OS === 'ios' ? (e.duration ?? 250) : 250,
        LayoutAnimation.Types.keyboard,
        LayoutAnimation.Properties.opacity,
      ));
      setKbBottomPad(0);
    });

    return () => { onShow.remove(); onHide.remove(); };
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

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          builders: data.builders,
          searchParams: data.searchParams,
        },
      ]);
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
      </AnimatedMessage>
    );
  }, [isDark, messages, router]);

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
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
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
          <View style={styles.headerSideSpacer} />
        </View>
      </LinearGradient>

      {/* ── Body — shrinks when keyboard is up ── */}
      <View style={[styles.flex1, { paddingBottom: kbBottomPad }]}>
        {/* ── Messages or Welcome ── */}
        {hasMessages ? (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
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
                borderColor: isDark ? '#334155' : '#E2E5E9',
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
      </View>

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
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    paddingBottom: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
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
