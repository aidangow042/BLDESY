/**
 * Generic locked-surface panel for portal feeds that aren't open yet
 * (Stage 2 business feeds). Port of ~/bldesy-web/components/portal/gate-teaser.tsx:
 * deliberately a teaser, not a hidden page — an empty feed looks broken, a
 * visible locked stage reads as a roadmap.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function GateTeaser({
  badge,
  title,
  body,
  footer,
}: {
  badge: string;
  title: string;
  body: ReactNode;
  footer?: ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.badge, { backgroundColor: c.primary + '1A' }]}>
        <Text style={[styles.badgeText, { color: c.primary }]}>{badge.toUpperCase()}</Text>
      </View>
      <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text>
      {footer ? <Text style={[styles.footer, { color: c.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['6xl'],
  },
  badge: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 2, // tracking-[0.18em]
  },
  title: {
    marginTop: Spacing.lg,
    fontSize: 20,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    marginTop: Spacing.sm,
    maxWidth: 448,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
  footer: {
    marginTop: Spacing.lg,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
