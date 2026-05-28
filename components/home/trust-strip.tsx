/**
 * TrustStrip — short social-proof row between hero and trades grid.
 * Mirrors `~/bldesy-web/components/home/trust-strip.tsx`.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ITEMS = [
  'Free for homeowners',
  '50+ verified trades',
  'ABN-checked tradies',
];

export function TrustStrip() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: c.surface, borderTopColor: c.border, borderBottomColor: c.border },
      ]}
    >
      <View style={styles.row}>
        {ITEMS.map((label) => (
          <View key={label} style={styles.item}>
            <Text style={[styles.check, { color: c.primary }]}>✓</Text>
            <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  check: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    fontWeight: '800',
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
});
