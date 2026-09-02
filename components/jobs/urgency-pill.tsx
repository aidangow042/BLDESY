/**
 * The urgency pill every portal job surface shares — the `urgencyPill()`
 * helper repeated across ~/bldesy-web/app/portal/jobs/**, applications and
 * the job detail page. ASAP = error tint, This Week = orange, Flexible = success.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Urgency } from '@/types/database';

export const URGENCY_LABELS: Record<Urgency, string> = {
  asap: 'ASAP',
  this_week: 'This Week',
  flexible: 'Flexible',
};

export function urgencyLabel(urgency: Urgency): string {
  return URGENCY_LABELS[urgency] ?? URGENCY_LABELS.flexible;
}

export function UrgencyPill({ urgency, size = 'sm' }: { urgency: Urgency; size?: 'sm' | 'md' }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tone = (() => {
    switch (urgency) {
      case 'asap':
        return { bg: c.error + '1A', fg: c.error };
      case 'this_week':
        // Tailwind orange-100 / orange-700 (same in dark on the web).
        return { bg: '#ffedd5', fg: '#c2410c' };
      case 'flexible':
      default:
        return { bg: c.successBg, fg: c.success };
    }
  })();
  return (
    <View style={[styles.pill, size === 'md' ? styles.md : styles.sm, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, size === 'md' ? styles.mdText : styles.smText, { color: tone.fg }]}>
        {urgencyLabel(urgency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: Radius.full, alignSelf: 'flex-start' },
  sm: { paddingHorizontal: 10, paddingVertical: 2 },
  md: { paddingHorizontal: 12, paddingVertical: 4 },
  text: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  smText: { fontSize: 12, lineHeight: 16 },
  mdText: { fontSize: 14, lineHeight: 20 },
});
