/**
 * My Applications — port of ~/bldesy-web/app/portal/applications/page.tsx:
 * the tradie's applications joined to their jobs, the Home / Project /
 * Contract toggle, status tabs with counts, and the LIVE empty state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApplicationStatusBadge } from '@/components/jobs/application-status-badge';
import { FeedSkeleton } from '@/components/jobs/feed-primitives';
import { UrgencyPill } from '@/components/jobs/urgency-pill';
import { PortalPage } from '@/components/portal/portal-page';
import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { listMyApplications, type MyApplication } from '@/lib/data/applications';
import { relativeTime } from '@/lib/format';
import { zoneIsLive } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';
import { formatTradeName } from '@/lib/web/trades';
import type { ApplicationStatus } from '@/types/database';

type FilterStatus = 'all' | ApplicationStatus;
type JobType = 'all' | 'residential' | 'commercial' | 'contract';

const STATUS_FILTERS: FilterStatus[] = ['all', 'pending', 'accepted', 'rejected'];
const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'Home' },
  { value: 'commercial', label: 'Project' },
  { value: 'contract', label: 'Contract' },
];

/** The website page's per-card filter, verbatim. */
export function applicationMatchesFilters(
  app: MyApplication,
  filter: FilterStatus,
  jobType: JobType,
): boolean {
  if (filter !== 'all' && app.status !== filter) return false;
  const job = app.job;
  if (jobType === 'residential' && job?.poster_type === 'enterprise') return false;
  if (jobType === 'commercial' && (job?.poster_type !== 'enterprise' || job?.posting_kind === 'contract')) return false;
  if (jobType === 'contract' && (job?.poster_type !== 'enterprise' || job?.posting_kind !== 'contract')) return false;
  return true;
}

export default function ApplicationsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useUser();
  const uid = user?.id ?? null;

  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [jobType, setJobType] = useState<JobType>('all');

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!uid) return;
      if (mode === 'refresh') setRefreshing(true);
      try {
        setApplications(await listMyApplications(uid));
      } catch (e) {
        toast.show(e instanceof Error ? e.message : String(e), { variant: 'error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid, toast],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      setLoading(false);
      return;
    }
    void load('initial');
  }, [authLoading, uid, load]);

  // Statuses change while the screen sits under a job page — re-read on focus.
  useFocusEffect(
    useCallback(() => {
      if (uid && !loading) void load('refresh');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]),
  );

  const visible = useMemo(
    () => applications.filter((a) => applicationMatchesFilters(a, filter, jobType)),
    [applications, filter, jobType],
  );

  const hasApplications = !loading && applications.length > 0;

  return (
    <PortalPage title="My Applications" subtitle="Track the status of your job applications" scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(app) => app.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing['4xl'] }]}
        ListHeaderComponent={
          hasApplications ? (
            <View style={styles.header}>
              <View style={[styles.segmented, { backgroundColor: c.surface, borderColor: c.border }]}>
                {JOB_TYPES.map((t) => {
                  const active = jobType === t.value;
                  const accent = t.value === 'commercial' || t.value === 'contract' ? c.indigo : c.primary;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setJobType(t.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.segment, active && [Shadows.sm, { backgroundColor: accent }]]}
                    >
                      <Text style={[styles.segmentText, { color: active ? '#fff' : c.textSecondary }]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.segmented, { backgroundColor: c.surface, borderColor: c.border }]}>
                {STATUS_FILTERS.map((f) => {
                  const active = filter === f;
                  const count =
                    f === 'all' ? applications.length : applications.filter((a) => a.status === f).length;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setFilter(f)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[styles.segment, active && [Shadows.sm, { backgroundColor: c.primary }]]}
                    >
                      <Text
                        style={[styles.segmentText, { color: active ? '#fff' : c.textSecondary }]}
                        numberOfLines={1}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <FeedSkeleton />
          ) : applications.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
              <MaterialIcons name="assignment" size={48} color={c.textSecondary + '66'} style={styles.emptyIcon} />
              {zoneIsLive('home_jobs') ? (
                <>
                  <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                    You haven&apos;t applied to any jobs yet.
                  </Text>
                  <View style={styles.emptyActions}>
                    {zoneIsLive('project_jobs') ? (
                      <Pressable
                        onPress={() => router.push(ROUTES.portalJobsCommercial)}
                        style={[styles.cta, { backgroundColor: c.indigo }]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.ctaText}>Browse Project Jobs</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => router.push(ROUTES.portalJobsResidential)}
                      style={[styles.cta, { backgroundColor: c.primary }]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.ctaText}>Browse Home Jobs</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                    Applications start when jobs open at launch — your first homeowner jobs will land in
                    the Home Jobs tab.
                  </Text>
                  <Pressable
                    onPress={() => router.push(ROUTES.portalEditProfile)}
                    style={[styles.cta, { backgroundColor: c.primary }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.ctaText}>Finish your profile</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null
        }
        renderItem={({ item: app }) => {
          const job = app.job;
          const isEnterprise = job?.poster_type === 'enterprise';
          return (
            <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={1}>
                {job?.title ?? 'Loading...'}
              </Text>
              {job ? (
                <View style={styles.pillRow}>
                  {isEnterprise ? (
                    <View style={[styles.pill, { backgroundColor: c.indigo + '1A' }]}>
                      <Text style={[styles.pillTextBold, { color: c.indigo }]}>
                        {job.posting_kind === 'contract' ? 'Contract' : 'Commercial'}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.pill, { backgroundColor: c.primary + '1A' }]}>
                    <Text style={[styles.pillText, { color: c.primary }]}>{formatTradeName(job.trade_category)}</Text>
                  </View>
                  <UrgencyPill urgency={job.urgency} />
                  <View style={styles.location}>
                    <MaterialIcons name="location-on" size={14} color={c.textSecondary} />
                    <Text style={[styles.locationText, { color: c.textSecondary }]}>
                      {job.suburb}, {job.postcode}
                    </Text>
                  </View>
                </View>
              ) : null}
              {job && isEnterprise ? (
                <View style={styles.detailRow}>
                  {job.day_rate ? (
                    <View style={[styles.detailChip, { backgroundColor: c.indigo + '0D' }]}>
                      <Text style={[styles.detailText, { color: c.indigo }]}>{job.day_rate}</Text>
                    </View>
                  ) : null}
                  {job.contract_duration ? (
                    <View style={[styles.detailChip, { backgroundColor: c.indigo + '0D' }]}>
                      <Text style={[styles.detailText, { color: c.indigo }]}>{job.contract_duration}</Text>
                    </View>
                  ) : null}
                  {job.workers_needed > 1 ? (
                    <View style={[styles.detailChip, { backgroundColor: c.indigo + '0D' }]}>
                      <Text style={[styles.detailText, { color: c.indigo }]}>{job.workers_needed} workers</Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => router.push(ROUTES.companyProfile(job.customer_id))}
                    style={[styles.detailChip, { backgroundColor: c.indigo + '0D' }]}
                    accessibilityRole="link"
                  >
                    <Text style={[styles.detailText, { color: c.indigo }]}>View Company →</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.statusRow}>
                <ApplicationStatusBadge status={app.status} />
                <Text style={[styles.appliedAt, { color: c.textSecondary }]}>
                  Applied {relativeTime(app.created_at)}
                </Text>
                <Pressable
                  onPress={() => router.push(ROUTES.portalJob(app.job_id))}
                  style={[styles.viewJob, { borderColor: c.border }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.viewJobText, { color: c.textSecondary }]}>View Job</Text>
                </Pressable>
              </View>

              {app.message ? (
                <View style={[styles.messageBox, { borderTopColor: c.border }]}>
                  <Text style={[styles.messageText, { color: c.textSecondary }]}>
                    <Text style={styles.messageLabel}>Your message:</Text>{' '}
                    <Text style={{ color: c.textPrimary }}>{app.message}</Text>
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={c.primary} />
        }
      />
    </PortalPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { gap: Spacing['2xl'], marginBottom: Spacing.sm },
  segmented: { flexDirection: 'row', gap: 4, borderRadius: Radius.lg, borderWidth: 1, padding: 4 },
  segment: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  empty: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing['5xl'], alignItems: 'center' },
  emptyIcon: { marginBottom: Spacing.lg },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyActions: { gap: Spacing.md, alignSelf: 'stretch', maxWidth: 448, width: '100%' },
  cta: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl },
  cardTitle: { fontSize: 16, lineHeight: 24, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  pillTextBold: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, fontFamily: FontFamily.body },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  detailChip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  detailText: { fontSize: 12, fontFamily: FontFamily.bodyMedium, fontWeight: '500' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  appliedAt: { fontSize: 12, fontFamily: FontFamily.body },
  viewJob: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewJobText: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  messageBox: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1 },
  messageText: { fontSize: 12, lineHeight: 18, fontFamily: FontFamily.body },
  messageLabel: { fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
