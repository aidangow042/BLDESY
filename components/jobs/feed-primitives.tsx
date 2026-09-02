/**
 * Shared chrome for the three portal job feeds (filter pills, loading
 * skeleton, empty card) — ~/bldesy-web/app/portal/jobs/**\/page.tsx.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { UrgencyFilter } from '@/lib/data/tradie-jobs';

/** The All / ASAP / This Week / Flexible pills, in the website's order. */
export const URGENCY_FILTERS: { value: UrgencyFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'asap', label: 'ASAP' },
  { value: 'this_week', label: 'This Week' },
  { value: 'flexible', label: 'Flexible' },
];

export function FilterPill({
  label,
  active,
  accent,
  onPress,
  accessibilityHint,
}: {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityHint={accessibilityHint}
      style={[
        styles.pill,
        active
          ? { backgroundColor: accent, borderColor: accent }
          : { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <Text style={[styles.pillText, { color: active ? '#fff' : c.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export function UrgencyFilterRow({
  value,
  onChange,
  accent,
  trailing,
}: {
  value: UrgencyFilter;
  onChange: (next: UrgencyFilter) => void;
  accent: string;
  /** Right-aligned extra control (Project Jobs: "Hide jobs I don't fully match"). */
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      {URGENCY_FILTERS.map((f) => (
        <FilterPill
          key={f.value}
          label={f.label}
          active={value === f.value}
          accent={accent}
          onPress={() => onChange(f.value)}
        />
      ))}
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

/** Three pulsing placeholder cards while a feed loads. */
export function FeedSkeleton() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.skeletonList}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton style={{ width: '66%', height: 20, marginBottom: 12 }} />
          <Skeleton style={{ width: '33%', height: 16, marginBottom: 16 }} />
          <Skeleton style={{ width: '100%', height: 16 }} />
        </View>
      ))}
    </View>
  );
}

/** The centred empty card: icon, message, optional second line. */
export function FeedEmpty({
  icon,
  message,
  children,
}: {
  icon: ReactNode;
  message: string;
  children?: ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={[styles.emptyText, { color: c.textSecondary }]}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  trailing: { marginLeft: 'auto' },
  pill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  pillText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  skeletonList: { gap: Spacing.lg },
  skeletonCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing['2xl'] },
  empty: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['5xl'],
    alignItems: 'center',
  },
  emptyIcon: { marginBottom: Spacing.lg },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textAlign: 'center',
  },
});
