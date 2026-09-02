/**
 * PortalPage — the page frame every portal screen renders inside (web shell
 * main column: `px-4 py-6` + `space-y-6`; h1 `text-2xl font-bold`, subtitle
 * `text-sm text-text-secondary`). The shell (app/portal/_layout.tsx) owns the
 * dark header, plan-state banners and tab bar. `scroll={false}` for screens
 * that own their own FlatList / inbox; `hideHeading` when a breadcrumb replaces
 * the h1 (job detail); `headerRight` is the slot beside the h1.
 */
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PortalPageProps {
  /** The page h1 (website: `text-2xl font-bold`). */
  title?: string;
  /** The line under the h1 (website: `text-sm text-text-secondary mt-1`). */
  subtitle?: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  /**
   * false = the screen owns its own list (FlatList / inbox) and the frame is a
   * plain flex column; default true = ScrollView with the web's `space-y-6`.
   */
  scroll?: boolean;
  /** Slot to the right of the h1. */
  headerRight?: ReactNode;
  /** Skip the h1/subtitle (job detail renders a breadcrumb instead). */
  hideHeading?: boolean;
  children: ReactNode;
}

export function PortalPage({
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  scroll = true,
  headerRight,
  hideHeading = false,
  children,
}: PortalPageProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const sidePadding = { paddingLeft: Spacing.lg + insets.left, paddingRight: Spacing.lg + insets.right };

  const heading = hideHeading || !title ? null : (
    <View style={styles.headingRow}>
      <View style={styles.headingText}>
        <Text style={[styles.h1, { color: c.textPrimary }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text style={[styles.sub, { color: c.textSecondary }]}>{subtitle}</Text>
          ) : (
            <View style={styles.subSlot}>{subtitle}</View>
          )
        ) : null}
      </View>
      {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
    </View>
  );

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: c.canvas }]}>
        {heading ? <View style={[styles.headingOnly, sidePadding]}>{heading}</View> : null}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.canvas }]}
      contentContainerStyle={[styles.content, sidePadding]}
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
      {heading}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingVertical: Spacing['2xl'], // web py-6
    gap: Spacing['2xl'], // web space-y-6
  },
  headingOnly: { paddingTop: Spacing['2xl'], paddingBottom: Spacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  headingText: { flex: 1, minWidth: 0 },
  h1: { fontSize: 24, lineHeight: 32, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sub: { marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  subSlot: { marginTop: 4 },
  headerRight: { alignSelf: 'flex-start' },
});
