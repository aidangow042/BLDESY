/**
 * DashboardScreen — the chrome every /dashboard tab renders inside: the global
 * AppShell (header + drawer + AI launcher, as the web keeps its site header on
 * /dashboard), the dark "My Dashboard" strip with the amber accent and the
 * identity summary (the web sidebar heading + profile summary), then the page
 * title block (`text-2xl font-bold` + `text-sm text-text-secondary`).
 */
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppShell } from '@/components/layout';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { useDashboardIdentity } from './dashboard-identity';
import { DASHBOARD_BAR_BG } from './dashboard-tab-bar';

interface DashboardScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Render children in a plain flex column instead of a ScrollView (lists that scroll themselves). */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /**
   * Non-scroll mode only: reports the height of the strip + title block above
   * `children`, so an embedded inbox can size its keyboard avoidance.
   */
  onChromeLayout?: (height: number) => void;
}

export function DashboardScreen({
  title,
  subtitle,
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  onChromeLayout,
}: DashboardScreenProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const titleBlock = (
    <View style={styles.titleBlock}>
      <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
        {title}
      </Text>
      {subtitle ? <Text style={[styles.sub, { color: c.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );

  if (!scroll) {
    return (
      <AppShell>
        <View onLayout={(e) => onChromeLayout?.(e.nativeEvent.layout.height)}>
          <DashboardStrip />
          <View style={styles.titlePad}>{titleBlock}</View>
        </View>
        <View style={styles.flex}>{children}</View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DashboardStrip />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.cta} /> : undefined
        }
      >
        {titleBlock}
        {children}
      </ScrollView>
    </AppShell>
  );
}

/** "My Dashboard" heading + identity summary, on the web sidebar's dark ground. */
function DashboardStrip() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { identity } = useDashboardIdentity();
  const initial = (identity.displayName[0] ?? '?').toUpperCase();

  return (
    <View style={styles.strip}>
      <View style={styles.brand}>
        <View style={[styles.brandIcon, { backgroundColor: c.cta + '26' }]}>
          <Ionicons name="home-outline" size={16} color={c.cta} />
        </View>
        <Text style={styles.brandText}>
          My <Text style={{ color: c.cta }}>Dashboard</Text>
        </Text>
      </View>
      <View style={styles.identity}>
        <View style={{ alignItems: 'flex-end', minWidth: 0, flexShrink: 1 }}>
          <Text numberOfLines={1} style={styles.identityName}>
            {identity.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.identitySub}>
            {identity.subtitle}
          </Text>
        </View>
        {identity.avatarUrl ? (
          <Image source={{ uri: identity.avatarUrl }} style={styles.avatar} contentFit="cover" accessibilityLabel={identity.displayName} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.cta + '26' }]}>
            <Text style={[styles.avatarInitial, { color: c.cta }]}>{initial}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
    gap: Spacing['2xl'],
  },
  titleBlock: { gap: 2 },
  titlePad: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  h1: { fontSize: 24, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: DASHBOARD_BAR_BG,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  brandIcon: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: '#ffffff', fontSize: 15, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: -0.2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexShrink: 1 },
  identityName: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  identitySub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: FontFamily.body },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
});
