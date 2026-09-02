/**
 * Yellow warning when the viewing tradie is missing required items, or a
 * green confirmation when they meet everything. Renders nothing if the job
 * has no requirements. Port of ~/bldesy-web/components/jobs/match-warning.tsx.
 */
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatPublicLiability } from '@/lib/web/capabilities';
import type { MatchResult } from '@/lib/web/match';

/** Tailwind amber-50 / amber-300 / amber-700 / amber-900 (the web's warning box). */
export const AMBER_BOX = {
  light: { bg: '#fffbeb', border: '#fcd34d99', icon: '#b45309', text: '#78350fE6' },
  dark: { bg: '#f59e0b1A', border: '#f59e0b4D', icon: '#fcd34d', text: '#fef3c7E6' },
} as const;

interface MatchWarningProps {
  match: MatchResult;
}

export function MatchWarning({ match }: MatchWarningProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const amber = AMBER_BOX[scheme];

  if (match.hasNoRequirements) return null;

  const missing: string[] = match.missingRequired.map((m) => m.label);
  const liabilityFails = match.publicLiabilityRequired != null && !match.publicLiabilityMet;
  if (liabilityFails) {
    const label = formatPublicLiability(match.publicLiabilityRequired) ?? 'Public Liability';
    missing.push(label);
  }

  if (missing.length === 0) {
    return (
      <View style={[styles.okPill, { backgroundColor: c.successBg }]}>
        <MaterialIcons name="check" size={14} color={c.success} />
        <Text style={[styles.okText, { color: c.success }]}>You meet all requirements</Text>
      </View>
    );
  }

  const list = missing.join(', ');
  const noun = `${missing.length} required item${missing.length !== 1 ? 's' : ''}`;

  return (
    <View style={[styles.box, { backgroundColor: amber.bg, borderColor: amber.border }]}>
      <MaterialIcons name="warning-amber" size={20} color={amber.icon} style={styles.icon} />
      <Text style={[styles.text, { color: amber.text }]}>
        You&apos;re missing {noun}:{' '}
        <Text style={styles.bold}>{list}</Text>. You can still apply, but the company may filter
        you out.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  okPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  okText: { fontSize: 12, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  icon: { marginTop: 2 },
  text: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  bold: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
