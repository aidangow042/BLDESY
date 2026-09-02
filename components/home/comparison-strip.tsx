/**
 * ComparisonStrip — ~/bldesy-web/components/home/comparison-strip.tsx: the
 * "vs pay-per-lead sites / gig apps / Google / word of mouth" cards on a light
 * strip. Copy verbatim.
 */
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const COMPARISONS: { vs: string; point: string; icon: IoniconName }[] = [
  {
    vs: 'Pay-per-lead sites',
    point: 'No per-lead fees. Flat subscription — keep more of what you earn.',
    icon: 'cash-outline',
  },
  {
    vs: 'Gig-job apps',
    point: 'Purpose-built for licensed trades, not odd jobs and errands.',
    icon: 'shield-checkmark-outline',
  },
  {
    vs: 'Google Search',
    point: 'Every profile checked five ways, with real photos of their work — not a page of ads and directories.',
    icon: 'sparkles-outline',
  },
  {
    vs: 'Word of Mouth',
    point: 'Search by trade, location & urgency. See credentials before you call.',
    icon: 'search-outline',
  },
];

export function ComparisonStrip() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View accessibilityLabel="Why BLDESY" style={[styles.section, { backgroundColor: c.canvas }]}>
      <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
        Why BLDESY!
      </Text>
      <View style={styles.grid}>
        {COMPARISONS.map((item) => (
          <View key={item.vs} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.cardHead}>
              <View style={[styles.iconBox, { backgroundColor: c.primaryBg }]}>
                <Ionicons name={item.icon} size={24} color={c.primary} />
              </View>
              <Text style={[styles.vs, { color: c.primary }]}>vs {item.vs}</Text>
            </View>
            <Text style={[styles.point, { color: c.textPrimary }]}>{item.point}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['5xl'],
  },
  h2: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: Spacing['4xl'],
  },
  grid: {
    gap: Spacing.lg,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vs: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  point: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
  },
});
