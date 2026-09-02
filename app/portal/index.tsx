/**
 * /portal — the tradie dashboard. Port of `~/bldesy-web/app/portal/page.tsx`,
 * top to bottom: welcome bar, the one-tap availability confirm (via
 * ?confirm=availability), the fresh-approval celebration, THE status card,
 * specialities prompt, new leads (EOI), the dismissible Refer & Earn card,
 * the four metric tiles (+ the shared completeness checklist behind the %),
 * the Application Breakdown chart and the Recent Activity feed.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from 'react-native-gifted-charts';

import { AvailabilityConfirmBanner } from '@/components/portal/availability-confirm-banner';
import { CelebrationCard } from '@/components/portal/celebration-card';
import { CompletenessChecklist } from '@/components/portal/completeness-checklist';
import { CompletenessRing } from '@/components/portal/completeness-ring';
import { EoiDashboardCards } from '@/components/portal/eoi-dashboard-cards';
import { MetricCard } from '@/components/portal/metric-card';
import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { SpecialitiesCard } from '@/components/portal/specialities-card';
import { StatusCard } from '@/components/portal/status-card';
import { ReferralDashboardCard } from '@/components/referrals/referral-dashboard-card';
import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import {
  getCompleteness,
  getCompletenessChecklist,
  getDashboardMetrics,
  type DashboardMetrics,
} from '@/lib/data/portal';
import { getAvailability } from '@/lib/web/availability';
import { relativeTime } from '@/lib/web/format';
import type { AvailabilityStatus } from '@/types/database';

export default function PortalDashboard() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { user } = useUser();
  const { profile, refreshProfile } = usePortal();
  const { confirm } = useLocalSearchParams<{ confirm?: string }>();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const load = useCallback(async () => {
    try {
      setMetrics(await getDashboardMetrics());
    } catch {
      /* the tiles keep their placeholders */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refreshProfile(), load()]);
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }

  /* -- Computed values --------------------------------------------------- */

  const totalApps = metrics?.totalApplications ?? 0;
  const accepted = metrics?.accepted ?? 0;
  const pending = metrics?.pending ?? 0;
  const rejected = metrics?.rejected ?? 0;
  const acceptanceRate = metrics?.acceptanceRate ?? 0;
  const completeness = profile ? getCompleteness(profile, user) : 0;
  const checklist = profile ? getCompletenessChecklist(profile, user) : [];
  const availStatus: AvailabilityStatus = profile?.availability ?? 'available';
  const avail = getAvailability(availStatus);
  const availTone = availabilityTone(availStatus, c);

  const appChartData = [
    { label: 'Accepted', value: accepted },
    { label: 'Pending', value: pending },
    { label: 'Rejected', value: rejected },
  ];
  const activityFeed = metrics?.recentActivity ?? [];

  const trades =
    profile?.trade_categories && profile.trade_categories.length > 0
      ? profile.trade_categories
      : profile?.trade_category
        ? [profile.trade_category]
        : [];

  /* -- Chart sizing ------------------------------------------------------ */

  function onChartLayout(e: LayoutChangeEvent) {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartWidth) setChartWidth(w);
  }
  const yAxisLabelWidth = 28;
  const initialSpacing = 12;
  const slot = chartWidth > 0 ? (chartWidth - yAxisLabelWidth - initialSpacing) / 3 : 0;
  const barWidth = Math.max(24, Math.floor(slot * 0.62));
  const barSpacing = Math.max(8, Math.floor(slot * 0.38));

  /* -- Render ------------------------------------------------------------ */

  return (
    <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
      {/* == Section 1: Welcome header bar ================================ */}
      <Card padding={0} style={styles.welcome}>
        <View style={styles.welcomeText}>
          <Text accessibilityRole="header" style={[styles.greeting, { color: c.textPrimary }]}>
            G&apos;day, {profile?.business_name ?? 'there'}
          </Text>
          <Text style={[styles.greetingSub, { color: c.textSecondary }]}>Here&apos;s your latest activity</Text>
        </View>
        <View style={styles.welcomeMeta}>
          {/* Availability pill */}
          <View style={[styles.availPill, { backgroundColor: availTone.bg }]}>
            <View style={[styles.availDot, { backgroundColor: availTone.dot }]} />
            <Text style={[styles.availLabel, { color: availTone.text }]}>{avail.label}</Text>
          </View>
          {/* Profile completeness ring */}
          <CompletenessRing percent={completeness} />
        </View>
      </Card>

      {/* == Weekly pulse one-tap (arrives via ?confirm=availability) ===== */}
      <AvailabilityConfirmBanner initialVisible={confirm === 'availability'} />

      {/* == One-off "you're live" celebration for fresh approvals ======== */}
      <CelebrationCard />

      {/* == Profile status — one card, five states, pause/go-live ======== */}
      <StatusCard />

      {/* == Specialities prompt — post-approval sub-trade picker ========= */}
      {user && profile ? <SpecialitiesCard trades={trades} initial={profile.specialisations ?? {}} /> : null}

      {/* == New leads — Expressions of Interest from the public profile ==== */}
      {user && profile ? <EoiDashboardCards refreshKey={refreshKey} /> : null}

      {/* == Refer & Earn card — dismiss persists to the profile row ======= */}
      {user && profile && !profile.referral_card_dismissed_at ? <ReferralDashboardCard /> : null}

      {/* == Section 2: Key metrics (4 cards) ============================= */}
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <MetricCard
            label="Total Applications"
            value={loading ? '--' : String(totalApps)}
            subtitle={loading ? 'Loading...' : 'All time'}
          />
          <MetricCard
            label="Accepted"
            value={loading ? '--' : String(accepted)}
            subtitle={loading ? '' : totalApps > 0 ? `${acceptanceRate}% rate` : 'No applications yet'}
          />
        </View>
        <View style={styles.gridRow}>
          <MetricCard label="Pending" value={loading ? '--' : String(pending)} subtitle="Awaiting response" />
          {/* The % tile shares the status card's checklist (P2.6) — tapping
              it expands the same deep-linked items. */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showChecklist }}
            onPress={() => setShowChecklist((v) => !v)}
            style={styles.gridCell}
          >
            <MetricCard
              label="Profile Complete"
              value={`${completeness}%`}
              subtitle={
                completeness >= 100
                  ? 'All done'
                  : completeness >= 80
                    ? "Looking great — tap for what's left"
                    : "Keep going — tap for what's left"
              }
            />
          </Pressable>
        </View>
      </View>

      {showChecklist && checklist.some((i) => !i.done) ? (
        <Card padding={Spacing.xl}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, marginBottom: Spacing.md }]}>
            Finish your profile
          </Text>
          <CompletenessChecklist items={checklist} />
        </Card>
      ) : null}

      {/* == Section 3: Application breakdown chart ====================== */}
      {totalApps > 0 ? (
        <Card padding={Spacing['2xl']}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Application Breakdown</Text>
          <Text style={[styles.sectionSub, { color: c.textSecondary, marginBottom: Spacing.xl }]}>
            Status of your job applications
          </Text>
          <View onLayout={onChartLayout} style={styles.chart}>
            {chartWidth > 0 ? (
              <BarChart
                data={appChartData}
                width={chartWidth - yAxisLabelWidth}
                height={200}
                barWidth={barWidth}
                spacing={barSpacing}
                initialSpacing={initialSpacing}
                yAxisLabelWidth={yAxisLabelWidth}
                frontColor={c.primary}
                barBorderRadius={6}
                noOfSections={4}
                hideRules
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisTextStyle={{ fontSize: 11, color: c.textSecondary }}
                xAxisLabelTextStyle={{ fontSize: 12, color: c.textSecondary }}
                disableScroll
                isAnimated
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {/* == Section 6: Recent activity feed ============================== */}
      <Card padding={0}>
        <View style={[styles.feedHeader, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Recent Activity</Text>
          <Text style={[styles.sectionSub, { color: c.textSecondary }]}>Your latest portal events</Text>
        </View>

        {loading ? (
          <View style={styles.feedEmpty} accessibilityLiveRegion="polite">
            <ActivityIndicator color={c.primary} accessibilityLabel="Loading activity" />
          </View>
        ) : activityFeed.length === 0 ? (
          <View style={styles.feedEmpty}>
            <Text style={[styles.feedEmptyText, { color: c.textSecondary }]}>No recent activity</Text>
          </View>
        ) : (
          <View>
            {activityFeed.map((event, i) => {
              const pill = statusPill(event.status, c);
              return (
                <View
                  key={event.applicationId}
                  style={[styles.feedRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
                >
                  <View style={[styles.feedIcon, { backgroundColor: c.primary + '1A' }]}>
                    <Ionicons name="briefcase-outline" size={16} color={c.primary} />
                  </View>
                  <View style={styles.feedBody}>
                    <Text numberOfLines={2} style={[styles.feedText, { color: c.textPrimary }]}>
                      Applied to &quot;{event.jobTitle ?? '...'}&quot;
                    </Text>
                    {pill ? (
                      <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.statusPillText, { color: pill.fg }]}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.feedTime, { color: c.textSecondary }]}>{relativeTime(event.createdAt)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </PortalPage>
  );
}

/* -- Helpers ------------------------------------------------------------- */

/** lib/availability.ts dot/bg/text classes → theme colours. */
function availabilityTone(status: AvailabilityStatus, c: Record<string, string>) {
  switch (status) {
    case 'limited':
      return { dot: c.warning, bg: c.warning + '1A', text: c.warning };
    case 'unavailable':
      return { dot: c.error, bg: c.error + '1A', text: c.error };
    case 'available':
    default:
      return { dot: c.success, bg: c.successBg, text: c.success };
  }
}

function statusPill(status: string, c: Record<string, string>): { bg: string; fg: string } | null {
  if (status === 'accepted') return { bg: c.successBg, fg: c.success };
  if (status === 'pending') return { bg: c.warning + '1A', fg: c.warning };
  if (status === 'rejected') return { bg: c.error + '1A', fg: c.error };
  return null;
}

const styles = StyleSheet.create({
  welcome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  welcomeText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  greetingSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  welcomeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  grid: {
    gap: Spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  gridCell: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  chart: {
    height: 240,
    overflow: 'hidden',
  },
  feedHeader: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  feedEmpty: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  feedEmptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
  },
  feedIcon: {
    marginTop: 2,
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedBody: {
    flex: 1,
    minWidth: 0,
  },
  feedText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  feedTime: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
});
