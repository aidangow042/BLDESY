/**
 * ChatHeader — gradient bar above the AI thread. Mirrors web
 * `components/ai/chat-header.tsx`: primary → primary-dark gradient, sparkle tile,
 * "AI Assist / Powered by Claude", `New chat` when there are messages.
 *
 * `variant="page"` sits under the global AppHeader on the /ai tab (the web keeps
 * the site header above it too). `variant="panel"` adds the expand-to-/ai and
 * close controls for the floating AI Assist card.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ChatHeaderProps {
  hasMessages: boolean;
  onClear: () => void;
  variant?: 'page' | 'panel';
  onExpand?: () => void;
  onClose?: () => void;
}

export function ChatHeader({
  hasMessages,
  onClear,
  variant = 'page',
  onExpand,
  onClose,
}: ChatHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const isPanel = variant === 'panel';

  return (
    <LinearGradient
      colors={[c.primary, c.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.bar}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={18} color="#ffffff" />
          </View>
          <View>
            <Text accessibilityRole="header" style={styles.title}>
              AI Assist
            </Text>
            <Text style={styles.subtitle}>Powered by Claude</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {hasMessages ? (
            <Pressable
              onPress={onClear}
              style={({ pressed }) => [
                styles.clearBtn,
                pressed && { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              hitSlop={4}
            >
              <Text style={styles.clearBtnText}>New chat</Text>
            </Pressable>
          ) : null}

          {isPanel ? (
            <>
              <Pressable
                onPress={onExpand}
                accessibilityRole="button"
                accessibilityLabel="Open full page"
                hitSlop={4}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}
              >
                <Ionicons name="expand-outline" size={16} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close AI Assist"
                hitSlop={4}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </Pressable>
            </>
          ) : null}
        </View>
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
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
