/**
 * ChatHeader — top bar inside the AI tab. Mirrors web `components/ai/chat-header.tsx`:
 * gradient primary → primary-dark, sparkle icon on left, "New chat" button on right
 * when there are messages.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ChatHeaderProps {
  hasMessages: boolean;
  onClear: () => void;
}

export function ChatHeader({ hasMessages, onClear }: ChatHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[c.primary, c.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      // Clear the status bar / Dynamic Island — this header sits at the very top
      // (the AI tab uses AppShell hideHeader, so there's no AppHeader inset).
      style={[styles.bar, { paddingTop: insets.top + Spacing.md }]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Text style={styles.sparkle}>✦</Text>
          </View>
          <View>
            <Text style={styles.title}>AI Assist</Text>
            <Text style={styles.subtitle}>Powered by Claude</Text>
          </View>
        </View>
        {hasMessages ? (
          <Pressable
            onPress={onClear}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && { backgroundColor: 'rgba(255,255,255,0.25)' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            hitSlop={4}
          >
            <Text style={styles.clearBtnText}>New chat</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    fontSize: 16,
    color: '#ffffff',
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 16,
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 12,
  },
  clearBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 11,
    color: '#ffffff',
  },
});
