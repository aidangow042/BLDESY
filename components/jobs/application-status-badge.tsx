/**
 * Pending / Accepted / Rejected pill — the `statusBadge()` helper shared by
 * ~/bldesy-web/app/portal/applications/page.tsx and app/portal/jobs/[id]/page.tsx.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ApplicationStatus } from '@/types/database';

export function applicationStatusLabel(status: ApplicationStatus | string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ApplicationStatusBadge({
  status,
  size = 'sm',
}: {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tone =
    status === 'accepted'
      ? { bg: c.successBg, fg: c.success }
      : status === 'rejected'
        ? { bg: c.error + '1A', fg: c.error }
        : { bg: c.warning + '1A', fg: c.warning };
  return (
    <View style={[styles.pill, size === 'md' ? styles.md : styles.sm, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, size === 'md' ? styles.mdText : styles.smText, { color: tone.fg }]}>
        {applicationStatusLabel(status)}
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
