/**
 * AppHeader — the website's mobile header row
 * (`~/bldesy-web/components/layout/header.tsx`, LIVE branch):
 *
 *   ☰ (✕ while the drawer is open) · BLDESY! wordmark · account slot
 *
 * Guests get the `Sign Up` (primary) / `Login` (cta amber) pills; signed-in
 * users get the 36px avatar that opens the account dropdown (`account-menu.tsx`).
 * Legacy stack screens still pass `title` / `showBack` / `onBackPress`: the back
 * chevron replaces ☰ and the title replaces the wordmark.
 *
 * 56px + safe-area top, `surface/95` with a hairline bottom border
 * (web: `bg-surface/95 backdrop-blur border-b`). Pair with `<HamburgerMenu>`, or
 * use `<AppShell>` which composes both plus the AI Assist launcher.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoles, useUser } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';
import { AccountMenu } from './account-menu';

const HEADER_HEIGHT = 56;
export const APP_HEADER_HEIGHT = HEADER_HEIGHT;

interface AppHeaderProps {
  /** Optional screen title (stack screens) — replaces the wordmark. */
  title?: string;
  /** Toggles the nav drawer. */
  onHamburgerPress: () => void;
  /** Drawer state — swaps ☰ for ✕ in place, as the web header does. */
  menuOpen?: boolean;
  /** Show a back chevron in place of ☰ (for stack screens). */
  showBack?: boolean;
  /** Override the back-button behaviour. Defaults to `router.back()`. */
  onBackPress?: () => void;
  /** Wrapper style override. */
  style?: ViewStyle;
}

export function AppHeader({
  title,
  onHamburgerPress,
  menuOpen = false,
  showBack = false,
  onBackPress,
  style,
}: AppHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { authedUser, loading } = useUser();
  const { avatarUrl } = useRoles();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: c.surface + 'F2', // web bg-surface/95
          borderBottomColor: c.border,
          paddingTop: insets.top,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {/* Far left: back chevron, or ☰ / ✕ */}
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBackPress ?? (() => router.back())}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: c.primaryBg }]}
          >
            {({ pressed }) => (
              <Ionicons
                name="chevron-back"
                size={26}
                color={pressed ? c.primary : c.textPrimary}
              />
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
            accessibilityState={{ expanded: menuOpen }}
            onPress={onHamburgerPress}
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: c.primaryBg }]}
          >
            {({ pressed }) => (
              <Ionicons
                name={menuOpen ? 'close' : 'menu'}
                size={26}
                color={pressed ? c.primary : c.textSecondary}
              />
            )}
          </Pressable>
        )}

        {/* Wordmark, or the stack screen's title */}
        {title ? (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.title, { color: c.textPrimary }]}
          >
            {title}
          </Text>
        ) : (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="BLDESY home"
            onPress={() => router.navigate(ROUTES.home)}
            hitSlop={8}
            style={styles.wordmarkBtn}
          >
            <Text style={[styles.wordmark, { color: c.primary }]}>BLDESY!</Text>
          </Pressable>
        )}

        {/* Right slot: account control */}
        <View style={styles.right}>
          {loading ? null : authedUser ? (
            <AccountMenu
              user={authedUser}
              avatarUrl={avatarUrl}
              anchorTop={insets.top + HEADER_HEIGHT + 6}
            />
          ) : (
            <View style={styles.pills}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.navigate(ROUTES.signup)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: pressed ? c.primaryDark : c.primary },
                ]}
              >
                <Text style={styles.pillText}>Sign Up</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.navigate(ROUTES.login)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: pressed ? c.ctaDark : c.cta },
                ]}
              >
                <Text style={styles.pillText}>Login</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  iconBtn: {
    height: 40,
    width: 40,
    marginLeft: -Spacing.sm, // web -ml-2: glyph hugs the edge, target stays 40px
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkBtn: {
    flex: 1,
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: FontFamily.display,
    fontSize: 24, // web text-2xl tracking-tight
    letterSpacing: -0.6,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  pillText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
});
