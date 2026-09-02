/**
 * MyJobCard — one posted job on /my-jobs. Port of the job card in
 * ~/bldesy-web/app/my-jobs/page.tsx: title, trade / urgency / status pills,
 * delete, meta row (location · budget · posted), description preview, the
 * "View Applicants" toggle and the expandable applicants section.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ApplicationWithApplicant } from '@/lib/data/applications';
import { formatTradeName } from '@/lib/web/trades';
import type { Job } from '@/types';

import { ApplicantRow } from './applicant-row';
import { formatBudget, relativeTime, statusConfig, urgencyConfig, type StatusTone } from './job-format';
import { JobPhotoStrip } from './job-photo-strip';

export interface ApplicantsState {
  apps: ApplicationWithApplicant[];
  loading: boolean;
}

interface MyJobCardProps {
  job: Job;
  expanded: boolean;
  applicants: ApplicantsState | undefined;
  /** Application id whose accept/reject is in flight. */
  actionLoading: string | null;
  /** Application id whose Message button is opening a conversation. */
  messagingId: string | null;
  onToggleApplicants: () => void;
  onDelete: () => void;
  onAccept: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
  onMessage: (builderUserId: string, applicationId: string) => void;
}

export function MyJobCard({
  job,
  expanded,
  applicants,
  actionLoading,
  messagingId,
  onToggleApplicants,
  onDelete,
  onAccept,
  onReject,
  onMessage,
}: MyJobCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const urg = urgencyConfig(job.urgency);
  const stat = statusConfig(job.status);

  return (
    <Card>
      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: c.textPrimary }]}>{job.title}</Text>
            <View style={styles.badges}>
              <Badge variant="trade">{formatTradeName(job.trade_category)}</Badge>
              <Badge variant={urg.variant}>{urg.label}</Badge>
              <StatusPill label={stat.label} tone={stat.tone} scheme={scheme} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete job"
            onPress={onDelete}
            hitSlop={6}
            style={({ pressed }) => [styles.deleteBtn, pressed && { backgroundColor: c.errorBg }]}
          >
            {({ pressed }) => (
              <Ionicons name="trash-outline" size={20} color={pressed ? c.error : c.textSecondary + '80'} />
            )}
          </Pressable>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={16} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>
              {job.suburb}, {job.postcode}
            </Text>
          </View>
          {job.budget ? (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.metaText, { color: c.textSecondary }]}>{formatBudget(job.budget)}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={c.textSecondary} />
            <Text style={[styles.metaText, { color: c.textSecondary }]}>{relativeTime(job.created_at)}</Text>
          </View>
        </View>

        {/* Photos */}
        {job.photo_urls && job.photo_urls.length > 0 ? (
          <View style={{ marginTop: Spacing.md }}>
            <JobPhotoStrip urls={job.photo_urls} />
          </View>
        ) : null}

        {/* Description preview */}
        <Text style={[styles.description, { color: c.textSecondary }]} numberOfLines={2}>
          {job.description}
        </Text>

        {/* View Applicants button */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggleApplicants}
          style={({ pressed }) => [
            styles.applicantsBtn,
            { borderColor: c.primary, backgroundColor: pressed ? c.primaryBg : 'transparent' },
          ]}
        >
          <Ionicons name="people-outline" size={16} color={c.primary} />
          <Text style={[styles.applicantsBtnText, { color: c.primary }]}>View Applicants</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.primary} />
        </Pressable>
      </View>

      {/* Applicants section */}
      {expanded ? (
        <View style={[styles.applicants, { borderTopColor: c.border, backgroundColor: c.canvas + '80' }]}>
          {!applicants || applicants.loading ? (
            <View style={styles.applicantsLoading}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : applicants.apps.length === 0 ? (
            <Text style={[styles.noApplicants, { color: c.textSecondary }]}>No applicants yet.</Text>
          ) : (
            <View style={{ gap: Spacing.lg }}>
              <Text style={[styles.applicantsHeading, { color: c.textSecondary }]}>
                APPLICANTS ({applicants.apps.length})
              </Text>
              {applicants.apps.map((app) => (
                <ApplicantRow
                  key={app.id}
                  application={app}
                  jobId={job.id}
                  jobStatus={job.status}
                  busy={actionLoading === app.id}
                  messaging={messagingId === app.id}
                  onAccept={() => onAccept(app.id)}
                  onReject={() => onReject(app.id)}
                  onMessage={() => onMessage(app.builder_id, app.id)}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </Card>
  );
}

/** Job status pill — web: Open green · Assigned blue · Completed / Closed grey. */
export function StatusPill({ label, tone, scheme }: { label: string; tone: StatusTone; scheme: 'light' | 'dark' }) {
  const c = Colors[scheme];
  const palette =
    tone === 'success'
      ? { bg: c.successBg, fg: c.success }
      : tone === 'info'
        ? scheme === 'dark'
          ? { bg: '#1E3A5F', fg: '#93C5FD' }
          : { bg: '#DBEAFE', fg: '#1D4ED8' }
        : { bg: c.canvas, fg: c.textSecondary };
  return (
    <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statusPillText, { color: palette.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  title: { fontSize: 18, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  deleteBtn: { padding: Spacing.sm, borderRadius: Radius.md },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, fontFamily: FontFamily.body },
  description: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, marginTop: Spacing.md },
  applicantsBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    marginTop: Spacing.lg,
  },
  applicantsBtnText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  applicants: { borderTopWidth: StyleSheet.hairlineWidth, padding: Spacing.xl },
  applicantsLoading: { paddingVertical: Spacing['2xl'], alignItems: 'center' },
  noApplicants: { paddingVertical: Spacing.lg, textAlign: 'center', fontSize: 14, fontFamily: FontFamily.body },
  applicantsHeading: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', letterSpacing: 0.6 },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontFamily: FontFamily.bodyBold, fontWeight: '700', letterSpacing: 0.6 },
});
