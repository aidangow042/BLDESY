/**
 * Application status breakdown — mirrors the website portal page's
 * Recharts bar chart and "acceptance rate" metric. Uses native View
 * widths so no chart library dependency is added.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useApplicationBreakdown } from '@/lib/dashboard-data';

interface Props {
  userId: string | null;
}

export function ApplicationBreakdown({ userId }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const { accepted, pending, rejected, total, acceptanceRate, loading } =
    useApplicationBreakdown(userId);

  if (loading || total === 0) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border },
        ]}
      >
        <Text style={[Type.label, { color: colors.textSecondary }]}>APPLICATION FUNNEL</Text>
        <Text style={[Type.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
          {loading
            ? 'Loading…'
            : 'Apply to your first job to start tracking your acceptance rate.'}
        </Text>
      </View>
    );
  }

  // Bar width = relative to the largest bucket so the visualisation
  // emphasises ratio, not raw count.
  const maxBucket = Math.max(accepted, pending, rejected, 1);
  const bars = [
    { label: 'Accepted', count: accepted, color: colors.success },
    { label: 'Pending', count: pending, color: colors.warning ?? '#d97706' },
    { label: 'Rejected', count: rejected, color: colors.error },
  ];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[Type.label, { color: colors.textSecondary }]}>APPLICATION FUNNEL</Text>
          <Text style={[Type.bodySemiBold, { color: colors.text }]}>
            {total} total · {accepted} accepted
          </Text>
        </View>
        <View style={[styles.ratePill, { backgroundColor: colors.tealBg }]}>
          <Ionicons name="trending-up" size={14} color={colors.teal} />
          <Text style={[styles.ratePillText, { color: colors.teal }]}>
            {acceptanceRate}% acceptance
          </Text>
        </View>
      </View>

      <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        {bars.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.text }]}>{bar.label}</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: bar.color,
                    width: `${(bar.count / maxBucket) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barCount, { color: colors.text }]}>{bar.count}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.textSecondary }]}>
        Acceptance rate = accepted ÷ (accepted + rejected). Pending applications don't count yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  ratePillText: { fontSize: 12, fontWeight: '800' },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 70,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barCount: {
    fontSize: 13,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  footnote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: Spacing.sm,
  },
});
