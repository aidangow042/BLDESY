/**
 * AppShell — the chrome every screen inherits: the website's mobile header row
 * (`AppHeader`), the left nav drawer (`HamburgerMenu`) and the AI Assist
 * launcher + floating panel (`AiAssistWidget`). The bottom tab bar is owned by
 * `app/(tabs)/_layout.tsx`.
 *
 * Usage:
 *   <AppShell title="My Jobs" showBack>…</AppShell>
 *   <AppShell hideAssist>…</AppShell>   // the /ai tab renders the thread itself
 */
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AiAssistWidget } from '@/components/ai/assist-widget';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppHeader } from './app-header';
import { HamburgerMenu } from './hamburger-menu';

interface AppShellProps {
  /** Optional screen title for stack screens (replaces the wordmark). */
  title?: string;
  /** Show a back chevron on the left instead of ☰. */
  showBack?: boolean;
  /** Override back behaviour (defaults to `router.back()`). */
  onBackPress?: () => void;
  /** Override the canvas background — useful for dark-themed screens. */
  background?: string;
  /** Hide the header entirely (e.g. for full-bleed screens). */
  hideHeader?: boolean;
  /** Hide the AI Assist launcher (the /ai tab). */
  hideAssist?: boolean;
  /** Wrapper style. */
  style?: ViewStyle;
  children: ReactNode;
}

export function AppShell({
  title,
  showBack,
  onBackPress,
  background,
  hideHeader = false,
  hideAssist = false,
  style,
  children,
}: AppShellProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((isOpen) => !isOpen), []);

  return (
    <View style={[styles.root, { backgroundColor: background ?? c.canvas }, style]}>
      {!hideHeader ? (
        <AppHeader
          title={title}
          showBack={showBack}
          onBackPress={onBackPress}
          menuOpen={menuOpen}
          onHamburgerPress={toggleMenu}
        />
      ) : null}
      {/* The launcher/panel layer lives INSIDE the body so the floating card can
          never slide under the header — it fills the content area only. */}
      <View style={styles.body}>
        {children}
        {!hideAssist ? <AiAssistWidget /> : null}
      </View>
      <HamburgerMenu open={menuOpen} onClose={closeMenu} topOffset={hideHeader ? 0 : undefined} />
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
