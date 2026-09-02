/**
 * OrDivider — hairline · label · hairline. Mirrors the website's
 * `flex items-center gap-3` divider with `text-xs font-medium text-text-secondary`.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function OrDivider({ label }: { label: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.row}>
      <View style={[styles.line, { backgroundColor: c.border }]} />
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: c.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
});
