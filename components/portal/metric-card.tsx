/**
 * MetricCard — the dashboard's four metric tiles
 * (`~/bldesy-web/app/portal/page.tsx`, "Metric card component").
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: ReactNode;
  subtitle: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing.xl} style={styles.card}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: c.textPrimary }]}>{value}</Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  value: {
    marginTop: 6,
    fontSize: 30,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
});
