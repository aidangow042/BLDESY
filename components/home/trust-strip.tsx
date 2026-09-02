/**
 * TrustStrip — ~/bldesy-web/components/home/trust-strip.tsx (the launch-mode
 * strip under the hero). Homeowner-value messaging — deliberately NOT
 * verification (the hero pills already cover Licensed · Insured · ID checked),
 * so the two rows don't repeat.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ITEMS = ['Free to search', 'No lead fees', 'Flat-fee tradies'];

export function TrustStrip() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View
      accessibilityLabel="Why use BLDESY"
      style={[styles.wrap, { backgroundColor: c.surface, borderTopColor: c.border, borderBottomColor: c.border }]}
    >
      {ITEMS.map((label) => (
        <View key={label} style={styles.item}>
          <Ionicons name="checkmark" size={16} color={c.primary} />
          <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
});
