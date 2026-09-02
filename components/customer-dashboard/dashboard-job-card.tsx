/**
 * DashboardJobCard — port of ~/bldesy-web/components/dashboard/job-card.tsx:
 * title + status badge, trade / urgency pills (urgency hidden on past jobs),
 * suburb, applicant count (numbers only) and the amber "View job →" link.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';

import { Badge, Card, type BadgeVariant } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { Job } from '@/types';
import type { JobStatus, Urgency } from '@/types/database';

export type DashboardJob = Pick<Job, 'id' | 'title' | 'trade_category' | 'urgency' | 'suburb' | 'status' | 'created_at'>;

export const ACTIVE_STATUSES: readonly JobStatus[] = ['open', 'in_progress'];

export function isPastJob(status: JobStatus): boolean {
  return !ACTIVE_STATUSES.includes(status);
}

/** "applicant" / "applicants" — the web's `applicant{applicants !== 1 ? "s" : ""}`. */
export function applicantNoun(count: number): string {
  return `applicant${count !== 1 ? 's' : ''}`;
}

function urgencyPill(urgency: Urgency): { label: string; variant: BadgeVariant } {
  switch (urgency) {
    case 'asap':
      return { label: 'ASAP', variant: 'error' };
    case 'this_week':
      return { label: 'This Week', variant: 'warning' };
    default:
      return { label: 'Flexible', variant: 'success' };
  }
}

/** Dashboard status labels — note "In Progress" here vs "Assigned" on /my-jobs (both verbatim). */
export function dashboardStatus(status: JobStatus): { label: string; variant: BadgeVariant | 'info' } {
  switch (status) {
    case 'open':
      return { label: 'Open', variant: 'success' };
    case 'in_progress':
      return { label: 'In Progress', variant: 'info' };
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    default:
      return { label: 'Closed', variant: 'neutral' };
  }
}

export function DashboardJobCard({ job, applicants }: { job: DashboardJob; applicants: number }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const isPast = isPastJob(job.status);
  const status = dashboardStatus(job.status);
  const urg = urgencyPill(job.urgency);

  return (
    <Card padding={Spacing.xl}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: c.textPrimary }]}>{job.title}</Text>
        {status.variant === 'info' ? (
          <View style={[styles.infoPill, { backgroundColor: scheme === 'dark' ? '#1E3A5F' : '#DBEAFE' }]}>
            <Text style={[styles.infoPillText, { color: scheme === 'dark' ? '#93C5FD' : '#1D4ED8' }]}>
              {status.label.toUpperCase()}
            </Text>
          </View>
        ) : (
          <Badge variant={status.variant}>{status.label}</Badge>
        )}
      </View>

      <View style={styles.pills}>
        <Badge variant="trade">{formatTradeName(job.trade_category)}</Badge>
        {!isPast ? <Badge variant={urg.variant}>{urg.label}</Badge> : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={c.textSecondary} />
            <Text style={[styles.meta, { color: c.textSecondary }]}>{job.suburb}</Text>
          </View>
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            <Text style={[styles.metaStrong, { color: c.textPrimary }]}>{applicants}</Text>
            {` ${applicantNoun(applicants)}`}
          </Text>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.myJobs as Href)} hitSlop={6}>
          <Text style={[styles.link, { color: scheme === 'dark' ? c.cta : c.ctaDark }]}>View job →</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  title: { flex: 1, fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  infoPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  infoPillText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginTop: Spacing.md },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, fontFamily: FontFamily.body },
  metaStrong: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  link: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
