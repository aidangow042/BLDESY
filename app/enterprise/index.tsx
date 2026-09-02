/**
 * /enterprise — the Enterprise Dashboard. Port of ~/bldesy-web/app/enterprise/page.tsx:
 * SMS-alerts nudge + legacy-licence banner, the welcome gradient, the plan
 * status card, four primary metrics, Live Job Insights, Top Performing Jobs
 * and the first five active jobs — with the same Realtime subscription for
 * new applications. Numbers come from lib/data/enterprise.ts
 * (computeEnterpriseMetrics), copy from the page.
 *
 * Not ported: the `?payment=success&session_id=` reconcile effect — that is
 * the return leg of the web-only Stripe checkout.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';

import { useEnterprise } from '@/components/enterprise/enterprise-context';
import {
  Divider,
  GradientHeader,
  HubScreen,
  LinkText,
  MetricCard,
  PillButton,
  SectionCard,
  Spinner,
  TinyPill,
  useHubTheme,
} from '@/components/enterprise/hub-primitives';
import { LegacyLicenceBanner } from '@/components/enterprise/legacy-licence-banner';
import { SmsAlertsPromptGate } from '@/components/enterprise/sms-alerts-prompt';
import { useToast } from '@/components/ui';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useUser } from '@/lib/auth-context';
import {
  computeEnterpriseMetrics,
  listEnterpriseJobs,
  type ApplicationCountRow,
  type EnterpriseJobWithCounts,
} from '@/lib/data/enterprise';
import { pluralise, relativeTime } from '@/lib/enterprise-hub/format';
import { ENTERPRISE_ANALYTICS_HREF, ENTERPRISE_BILLING_HREF, toHref } from '@/lib/enterprise-hub/nav';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { ROUTES } from '@/lib/routes';
import { db } from '@/lib/supabase';
import { formatTradeName } from '@/lib/web/trades';

export default function EnterpriseDashboardScreen() {
  const c = useHubTheme();
  const toast = useToast();
  const { authedUser } = useUser();
  const { profile, refreshProfile } = useEnterprise();
  const uid = authedUser?.id ?? null;

  const [jobs, setJobs] = useState<EnterpriseJobWithCounts[]>([]);
  const [allApps, setAllApps] = useState<ApplicationCountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const instanceId = useRef(Math.random().toString(36).slice(2));

  const load = useCallback(async () => {
    try {
      const res = await listEnterpriseJobs();
      setJobs(res.jobs);
      setAllApps(res.applications);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't load your dashboard.", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([load(), refreshProfile()]);
    setRefreshing(false);
  }

  // Real-time subscription for new applications — filtered to the user's
  // jobs. Supabase realtime supports `in` filters for up to ~100 values; past
  // that some inserts may be missed and a refresh catches them.
  const jobIdsKey = jobs.map((j) => j.id).join(',');
  useEffect(() => {
    if (!uid || !jobIdsKey) return;
    const jobIds = jobIdsKey.split(',');
    const channel = db
      .channel(`enterprise-apps:${uid}:${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
          ...(jobIds.length <= 100 ? { filter: `job_id=in.(${jobIds.join(',')})` } : {}),
        },
        (payload) => {
          const newApp = payload.new as ApplicationCountRow;
          setAllApps((prev) => [newApp, ...prev]);
          setJobs((prev) =>
            prev.map((j) => (j.id === newApp.job_id ? { ...j, applicant_count: j.applicant_count + 1 } : j)),
          );
        },
      )
      .subscribe();
    return () => {
      void db.removeChannel(channel);
    };
  }, [uid, jobIdsKey]);

  const m = useMemo(() => computeEnterpriseMetrics(jobs, allApps), [jobs, allApps]);
  const activeJobs = useMemo(() => jobs.filter((j) => j.status === 'open' || j.status === 'in_progress'), [jobs]);
  const topJobs = useMemo(
    () => m.topJobIds.map((id) => jobs.find((j) => j.id === id)).filter((j): j is EnterpriseJobWithCounts => !!j),
    [m.topJobIds, jobs],
  );
  const dash = loading ? '--' : undefined;

  const showPlanCard = !loading && (profile?.has_active_subscription || CAN_SELL_IN_APP);
  const isContractor = profile?.subscription_plan === 'unlimited';

  return (
    <HubScreen refreshing={refreshing} onRefresh={onRefresh} gap={Spacing['3xl']}>
      <SmsAlertsPromptGate
        userId={uid}
        initialPhone={profile?.contact_phone ?? null}
        alreadyEnabled={profile?.sms_alerts_enabled ?? false}
        onEnabled={() => void refreshProfile()}
      />
      {uid ? <LegacyLicenceBanner userId={uid} /> : null}

      {/* Welcome — gradient header */}
      <GradientHeader
        title={profile?.company_name ? `Welcome, ${profile.company_name}` : 'Welcome'}
        subtitle="Enterprise Dashboard"
        action={{ label: 'Post a Job', onPress: () => router.push(toHref(ROUTES.postJob)) }}
      />

      {/* Plan status card — hidden on iOS when there is nothing to show but a price */}
      {showPlanCard ? (
        <SectionCard>
          <View style={styles.planRow}>
            {profile?.has_active_subscription ? (
              <>
                <View style={[styles.planIcon, { backgroundColor: (isContractor ? c.primary : c.indigo) + '1A' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={isContractor ? c.primary : c.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, { color: c.textPrimary }]}>
                    {isContractor ? 'Contractor Plan' : 'Builder Plan'} — Active
                  </Text>
                  <Text style={[styles.planSub, { color: c.textSecondary }]}>
                    {isContractor ? 'Unlimited job posts' : 'Up to 5 job posts per month'}
                  </Text>
                </View>
                <LinkText label="Manage Plan" onPress={() => router.navigate(toHref(ENTERPRISE_BILLING_HREF))} />
              </>
            ) : (
              <>
                <View style={[styles.planIcon, { backgroundColor: c.canvas }]}>
                  <Ionicons name="card-outline" size={20} color={c.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, { color: c.textPrimary }]}>Pay as you go — $99/post</Text>
                  <Text style={[styles.planSub, { color: c.textSecondary }]}>Subscribe from $129/mo to save up to 74%</Text>
                </View>
                <PillButton
                  label="View Plans"
                  variant="outline-indigo"
                  size="sm"
                  onPress={() => router.navigate(toHref(ENTERPRISE_BILLING_HREF))}
                />
              </>
            )}
          </View>
        </SectionCard>
      ) : null}

      {/* Primary metrics */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <MetricCard label="Active Jobs" value={dash ?? m.activeJobs} accent={c.indigo} icon="briefcase-outline" />
          <MetricCard
            label="Total Applicants"
            value={dash ?? m.totalApplicants}
            accent={c.indigo}
            icon="people-outline"
            badge={!loading && m.appsToday > 0 ? <TinyPill label={`+${m.appsToday} today`} tone="success" size="xxs" /> : undefined}
          />
        </View>
        <View style={styles.gridRow}>
          <MetricCard label="Hired" value={dash ?? m.totalAccepted} accent={c.success} icon="checkmark-circle-outline" />
          <MetricCard label="Total Posted" value={dash ?? m.totalPosted} accent={c.indigo} icon="document-text-outline" />
        </View>
      </View>

      {/* Live Job Insights */}
      {!loading && jobs.length > 0 ? (
        <SectionCard tone="indigo">
          <View style={styles.insightsHeader}>
            <View style={styles.insightsTitleRow}>
              <View style={[styles.liveDot, { backgroundColor: c.indigo }]} />
              <Text style={[styles.insightsTitle, { color: c.indigo }]}>Live Job Insights</Text>
            </View>
            <LinkText label="View Full Analytics" icon="arrow-forward" onPress={() => router.navigate(toHref(ENTERPRISE_ANALYTICS_HREF))} />
          </View>
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <MetricCard label="Active Jobs" value={m.activeJobs} sub={`${m.openJobs} open, ${m.inProgressJobs} in progress`} compact />
              <MetricCard label="Fill Rate" value={`${m.fillRate}%`} sub={`${m.totalAccepted}/${m.totalWorkersNeeded} positions`} compact />
            </View>
            <View style={styles.gridRow}>
              <MetricCard
                label="Avg Time to Fill"
                value={m.avgTimeToFillDays !== null ? `${m.avgTimeToFillDays}d` : '--'}
                sub={`${m.filledJobs} jobs filled`}
                compact
              />
              <MetricCard label="Avg Apps/Job" value={m.avgAppsPerJob} sub={`across ${m.totalPosted} jobs`} compact />
            </View>
          </View>
        </SectionCard>
      ) : null}

      {/* Top Performing Jobs */}
      {!loading && topJobs.length > 0 && topJobs[0].applicant_count > 0 ? (
        <SectionCard
          title="Top Performing Jobs"
          action={{ label: 'Analytics', onPress: () => router.navigate(toHref(ENTERPRISE_ANALYTICS_HREF)) }}
          padding={0}
        >
          {topJobs.map((job, i) => (
            <View key={job.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(toHref(ROUTES.enterpriseJob(job.id)))}
                style={({ pressed }) => [styles.topRow, pressed && { backgroundColor: c.canvas + '80' }]}
              >
                <View style={[styles.rank, { backgroundColor: c.indigo + '1A' }]}>
                  <Text style={[styles.rankLabel, { color: c.indigo }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: c.textPrimary }]}>
                    {job.title}
                  </Text>
                  <View style={styles.rowMeta}>
                    <TinyPill label={formatTradeName(job.trade_category)} tone="indigo" size="xxs" />
                    <Text style={[styles.rowMetaText, { color: c.textSecondary }]}>{job.suburb}</Text>
                    <Text style={[styles.rowMetaText, { color: c.textSecondary }]}>· {relativeTime(job.created_at)}</Text>
                  </View>
                  {job.workers_needed > 1 ? (
                    <View style={styles.fillRow}>
                      <View style={[styles.fillTrack, { backgroundColor: c.border }]}>
                        <View
                          style={[
                            styles.fillBar,
                            {
                              backgroundColor: c.indigo,
                              width: `${Math.min(100, (job.accepted_count / job.workers_needed) * 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.fillLabel, { color: c.indigo }]}>
                        {job.accepted_count}/{job.workers_needed}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.rowCount, { color: c.textPrimary }]}>{job.applicant_count}</Text>
                  <Text style={[styles.rowMetaText, { color: c.textSecondary }]}>applicants</Text>
                </View>
              </Pressable>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {/* Active jobs list */}
      <SectionCard
        title="All Active Jobs"
        action={{ label: 'View all', onPress: () => router.navigate(toHref(ROUTES.enterpriseJobs)) }}
        padding={0}
      >
        {loading ? (
          <Spinner minHeight={120} />
        ) : activeJobs.length === 0 ? (
          <View style={styles.emptyActive}>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>No active job posts yet.</Text>
            <LinkText label="Post your first job" size={14} onPress={() => router.push(toHref(ROUTES.postJob))} />
          </View>
        ) : (
          activeJobs.slice(0, 5).map((job, i) => (
            <View key={job.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(toHref(ROUTES.enterpriseJob(job.id)))}
                style={({ pressed }) => [styles.activeRow, pressed && { backgroundColor: c.canvas + '80' }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: c.textPrimary }]}>
                    {job.title}
                  </Text>
                  <Text style={[styles.rowSub, { color: c.textSecondary }]}>
                    {job.suburb} · {formatTradeName(job.trade_category)}
                  </Text>
                </View>
                <View style={styles.activeRight}>
                  <Text style={[styles.rowSub, { color: c.textSecondary }]}>{pluralise(job.applicant_count, 'applicant')}</Text>
                  {job.workers_needed > 1 ? (
                    <TinyPill label={`${job.accepted_count}/${job.workers_needed} filled`} tone="indigo" size="xxs" />
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={c.textSecondary + '80'} />
                </View>
              </Pressable>
            </View>
          ))
        )}
      </SectionCard>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  planSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  insightsTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  rowMetaText: {
    fontSize: 10,
    fontFamily: FontFamily.body,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  rowCount: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  fillRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fillTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 3,
  },
  fillLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  emptyActive: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  activeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
