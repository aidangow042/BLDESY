/**
 * AppShell — wraps a screen with the sticky `<AppHeader>` + `<HamburgerMenu>`
 * and a content area that respects bottom-tab-bar / safe area insets.
 *
 * Replaces the per-screen `PageHeader` + `SafeAreaView` boilerplate. Use this
 * on every screen so the chrome stays consistent.
 *
 * Usage:
 *   export default function MyScreen() {
 *     return (
 *       <AppShell title="My Jobs">
 *         <ScrollView>... your content ...</ScrollView>
 *       </AppShell>
 *     );
 *   }
 */

import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppHeader } from './app-header';
import { HamburgerMenu } from './hamburger-menu';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppShellProps {
  /** Optional screen title for stack screens. */
  title?: string;
  /** Show a back-chevron on the left instead of the wordmark. */
  showBack?: boolean;
  /** Override back behaviour (defaults to `router.back()`). */
  onBackPress?: () => void;
  /** Override the canvas background — useful for dark-themed screens. */
  background?: string;
  /** Hide the header entirely (e.g. for full-bleed screens like Map). */
  hideHeader?: boolean;
  /** Wrapper style. */
  style?: ViewStyle;
  children: React.ReactNode;
}

export function AppShell({
  title,
  showBack,
  onBackPress,
  background,
  hideHeader = false,
  style,
  children,
}: AppShellProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: background ?? c.canvas }, style]}>
      {!hideHeader ? (
        <AppHeader
          title={title}
          showBack={showBack}
          onBackPress={onBackPress}
          onHamburgerPress={() => setMenuOpen(true)}
        />
      ) : null}
      <View style={styles.body}>{children}</View>
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
