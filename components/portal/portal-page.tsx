/**
 * PortalPage — the scroll container every portal screen renders inside. The
 * web shell's main column is `px-4 py-6` with `space-y-6` between sections;
 * the shell (app/portal/_layout.tsx) owns the header, plan-state banners and
 * the dark tab bar, so this only pads the content, wires pull-to-refresh and
 * keeps the horizontal safe area (landscape / notch edges).
 *
 * Props are deliberately minimal — the other portal screens reuse it as-is.
 */
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PortalPageProps {
  /** Optional page heading (web `text-2xl font-bold`). */
  title?: string;
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function PortalPage({ title, children, onRefresh, refreshing = false }: PortalPageProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: c.canvas }]}
      contentContainerStyle={[
        styles.content,
        { paddingLeft: Spacing.lg + insets.left, paddingRight: Spacing.lg + insets.right },
      ]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        ) : undefined
      }
    >
      {title ? (
        <View>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            {title}
          </Text>
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: Spacing['2xl'], // web py-6
    gap: Spacing['2xl'], // web space-y-6
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
