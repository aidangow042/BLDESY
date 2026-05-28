/**
 * AppHeader — sticky top header used by every screen. Mirrors the web's
 * `~/bldesy-web/components/layout/header.tsx`:
 *   • Left: BLDESY! wordmark (Russo One, primary colour)
 *   • Centre/title slot (optional, for stack screens)
 *   • Right: hamburger button → opens `<HamburgerMenu>`
 *
 * Pair this with `<HamburgerMenu>` (or use the convenience wrapper `<AppShell>`
 * which composes both).
 */

import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppHeaderProps {
  /** Optional screen title shown centred between wordmark and hamburger. */
  title?: string;
  /** Callback fired when the hamburger is tapped. */
  onHamburgerPress: () => void;
  /** Show a back-chevron in place of the wordmark (for stack screens). */
  showBack?: boolean;
  /** Override the back-button behaviour. Defaults to `router.back()`. */
  onBackPress?: () => void;
  /** Wrapper style override. */
  style?: ViewStyle;
}

export function AppHeader({
  title,
  onHamburgerPress,
  showBack = false,
  onBackPress,
  style,
}: AppHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: c.surface + 'F2', // ~95% opacity for the "translucent surface" feel
          borderBottomColor: c.border,
          paddingTop: insets.top,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {/* Left slot */}
        <View style={styles.left}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBackPress ?? (() => router.back())}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { backgroundColor: c.primaryBg },
              ]}
              hitSlop={8}
            >
              <Text style={[styles.chevron, { color: c.textPrimary }]}>‹</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Home"
              onPress={() => router.push('/(tabs)' as any)}
            >
              <Text style={[styles.wordmark, { color: c.primary }]}>BLDESY!</Text>
            </Pressable>
          )}
        </View>

        {/* Centre slot */}
        {title ? (
          <View style={styles.centre}>
            <Text
              numberOfLines={1}
              accessibilityRole="header"
              style={[styles.title, { color: c.textPrimary }]}
            >
              {title}
            </Text>
          </View>
        ) : null}

        {/* Right slot — hamburger */}
        <View style={styles.right}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={onHamburgerPress}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { backgroundColor: c.primaryBg },
            ]}
            hitSlop={6}
          >
            <View style={styles.burger}>
              <View style={[styles.burgerLine, { backgroundColor: c.textSecondary }]} />
              <View style={[styles.burgerLine, { backgroundColor: c.textSecondary }]} />
              <View style={[styles.burgerLine, { backgroundColor: c.textSecondary }]} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const HEADER_HEIGHT = 56;
export const APP_HEADER_HEIGHT = HEADER_HEIGHT;

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  left: {
    minWidth: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    minWidth: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
  },
  iconBtn: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 28,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
  },
  burger: {
    width: 22,
    height: 14,
    justifyContent: 'space-between',
  },
  burgerLine: {
    height: 2,
    borderRadius: 1,
  },
});
