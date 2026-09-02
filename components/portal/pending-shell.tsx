/**
 * PendingShell — the centred status card the pending page wraps its
 * verifying / rejected / flagged / suspended states in
 * (`~/bldesy-web/app/portal/pending/page.tsx`, PendingShell).
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function PendingShell({
  title,
  tone,
  children,
}: {
  title: string;
  tone: 'info' | 'warning';
  children: ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const iconBg = tone === 'warning' ? c.warning + '1A' : c.primary + '1A';
  const iconColor = tone === 'warning' ? c.warning : c.primary;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.canvas }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card padding={Spacing['3xl']} style={styles.card}>
          <View style={[styles.icon, { backgroundColor: iconBg }]}>
            <Ionicons
              name={tone === 'warning' ? 'alert-circle-outline' : 'time-outline'}
              size={40}
              color={iconColor}
            />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            {title}
          </Text>
          {children}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export const pendingStyles = StyleSheet.create({
  body: {
    marginBottom: Spacing['2xl'],
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  bodySm: {
    marginBottom: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  primaryPill: {
    alignSelf: 'center',
    borderRadius: 9999,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  outlinePill: {
    alignSelf: 'center',
    borderRadius: 9999,
    borderWidth: 2,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pillText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  errorBox: {
    marginBottom: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  card: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    marginBottom: Spacing.md,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
