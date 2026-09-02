/**
 * /enterprise/analytics — Job Analytics. Port of
 * ~/bldesy-web/app/enterprise/analytics/page.tsx: period pills, the eight
 * metric cards, Applications Over Time, Top Trades Applying / Top Applicant
 * Locations, the Per-Job Breakdown and Compare Jobs (2–3). Numbers and copy
 * come from lib/enterprise-hub/analytics.ts; the empty states are the page's.
 * Charts: react-native-gifted-charts for the time series; the ranked lists
 * render as labelled bars.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';

import { useEnterprise } from '@/components/enterprise/enterprise-context';
import { PillTabs } from '@/components/enterprise/hub-form';
import {
  GradientHeader,
  HubScreen,
  SectionCard,
  TinyPill,
  useHubTheme,
  type IoniconName,
} from '@/components/enterprise/hub-primitives';
import { CountUp, Skeleton, useToast } from '@/components/ui';
import { FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import {
  COMPARE_COLORS,
  COMPARE_METRICS,
  compareBars,
  EMPTY_ENTERPRISE_METRICS,
  ENTERPRISE_PERIODS,
  getEnterpriseAnalytics,
  JOB_ROW_SORTS,
  relTime,
  sortJobRows,
  toggleCompareId,
  type AnalyticsJobRow,
  type DailyApps,
  type EnterpriseAnalyticsData,
  type EnterprisePeriod,
  type JobRowSort,
  type RankedItem,
} from '@/lib/enterprise-hub/analytics';
import { toHref } from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';

// Tailwind indigo-700 / indigo-600 / violet-500 — the analytics header gradient.
const HEADER_GRADIENT: [string, string, string] = ['#4338ca', '#4f46e5', '#8b5cf6'];
// Card accents: indigo-500 · emerald-600 · amber-500 · violet-500.
const ACCENT = { indigo: '#6366f1', emerald: '#059669', amber: '#f59e0b', violet: '#8b5cf6' } as const;

const EMPTY_DATA: EnterpriseAnalyticsData = {
  period: '30d',
  metrics: EMPTY_ENTERPRISE_METRICS,
  dailyApps: [],
  topTrades: [],
  topLocations: [],
  jobRows: [],
};

export default function EnterpriseAnalyticsScreen() {
  const c = useHubTheme();
  const toast = useToast();
  const { profile } = useEnterprise();
  const { width } = useWindowDimensions();

  const [period, setPeriod] = useState<EnterprisePeriod>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EnterpriseAnalyticsData>(EMPTY_DATA);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [tableSort, setTableSort] = useState<JobRowSort>('apps');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getEnterpriseAnalytics(period));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't load analytics.", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedRows = useMemo(() => sortJobRows(data.jobRows, tableSort), [data.jobRows, tableSort]);
  const { metrics } = data;

  const metricCards: { label: string; value: number; icon: IoniconName; accent: string; suffix: '' | '%'; decimal?: boolean }[] = [
    { label: 'JOB VIEWS', value: metrics.jobViews, icon: 'eye-outline', accent: ACCENT.indigo, suffix: '' },
    { label: 'APPLICATIONS', value: metrics.applications, icon: 'document-text-outline', accent: ACCENT.indigo, suffix: '' },
    { label: 'VIEW → APPLY', value: metrics.viewToApplyRate, icon: 'swap-vertical-outline', accent: ACCENT.emerald, suffix: '%' },
    { label: 'FILL RATE', value: metrics.fillRate, icon: 'time-outline', accent: ACCENT.amber, suffix: '%' },
    { label: 'JOBS POSTED', value: metrics.jobsPosted, icon: 'briefcase-outline', accent: ACCENT.indigo, suffix: '' },
    { label: 'AVG APPS/JOB', value: metrics.avgAppsPerJob, icon: 'bar-chart-outline', accent: ACCENT.indigo, suffix: '', decimal: true },
    { label: 'POSITIONS FILLED', value: metrics.positionsFilled, icon: 'checkmark-circle-outline', accent: ACCENT.emerald, suffix: '' },
    { label: 'WORKERS NEEDED', value: metrics.workersNeeded, icon: 'people-outline', accent: ACCENT.violet, suffix: '' },
  ];

  // Content column minus the card padding — the chart's drawable width.
  const chartWidth = Math.max(200, width - Spacing.lg * 2 - Spacing['2xl'] * 2 - 40);

  if (loading) {
    return (
      <HubScreen gap={Spacing['2xl']}>
        <Skeleton style={{ height: 128, borderRadius: Radius.xl }} />
        <View style={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.gridRow}>
              <Skeleton style={{ flex: 1, height: 112, borderRadius: Radius.lg }} />
              <Skeleton style={{ flex: 1, height: 112, borderRadius: Radius.lg }} />
            </View>
          ))}
        </View>
        <Skeleton style={{ height: 320, borderRadius: Radius.lg }} />
      </HubScreen>
    );
  }

  return (
    <HubScreen gap={Spacing['2xl']}>
      {/* Header */}
      <GradientHeader
        colors={HEADER_GRADIENT}
        title={
          <Text accessibilityRole="header" style={styles.displayTitle}>
            Job Analytics
          </Text>
        }
        subtitle={`${profile?.company_name || 'Enterprise'} — Performance insights`}
      >
        <PillTabs options={ENTERPRISE_PERIODS} value={period} onChange={setPeriod} onDark />
      </GradientHeader>

      {/* 8 Metric Cards */}
      <View style={styles.grid}>
        {[0, 2, 4, 6].map((start) => (
          <View key={start} style={styles.gridRow}>
            {metricCards.slice(start, start + 2).map((m) => (
              <View
                key={m.label}
                style={[styles.metric, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: m.accent }]}
              >
                <View style={styles.metricLabelRow}>
                  <Ionicons name={m.icon} size={16} color={c.textSecondary} />
                  <Text style={[styles.metricLabel, { color: c.textSecondary }]} numberOfLines={1}>
                    {m.label}
                  </Text>
                </View>
                <CountUp
                  value={m.value}
                  duration={800}
                  format={(n) =>
                    m.suffix === '%' ? `${Math.round(n)}%` : m.decimal ? String(Math.round(n * 10) / 10) : String(Math.round(n))
                  }
                  style={[styles.metricValue, { color: c.textPrimary }]}
                />
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Applications Over Time */}
      <SectionCard padding={Spacing['2xl']}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Applications Over Time</Text>
        {data.dailyApps.length === 0 ? (
          <Text style={[styles.emptyChart, { color: c.textSecondary }]}>No application data for this period</Text>
        ) : (
          <DailyChart data={data.dailyApps} width={chartWidth} period={period} />
        )}
      </SectionCard>

      {/* Top Trades + Top Locations */}
      <SectionCard padding={Spacing['2xl']}>
        <Text style={[styles.cardTitleSm, { color: c.textPrimary }]}>Top Trades Applying</Text>
        {data.topTrades.length === 0 ? (
          <Text style={[styles.emptySmall, { color: c.textSecondary }]}>No trade data yet</Text>
        ) : (
          <RankedBars items={data.topTrades} colour="#0D7C66" />
        )}
      </SectionCard>
      <SectionCard padding={Spacing['2xl']}>
        <Text style={[styles.cardTitleSm, { color: c.textPrimary }]}>Top Applicant Locations</Text>
        {data.topLocations.length === 0 ? (
          <Text style={[styles.emptySmall, { color: c.textSecondary }]}>No location data yet</Text>
        ) : (
          <RankedBars items={data.topLocations} colour="#4f46e5" />
        )}
      </SectionCard>

      {/* Per-Job Breakdown */}
      <SectionCard padding={Spacing['2xl']}>
        <View style={styles.breakdownHeader}>
          <Text style={[styles.cardTitle, { color: c.textPrimary, marginBottom: 0 }]}>Per-Job Breakdown</Text>
          <PillTabs options={JOB_ROW_SORTS} value={tableSort} onChange={setTableSort} />
        </View>
        {sortedRows.length === 0 ? (
          <Text style={[styles.emptySmall, { color: c.textSecondary }]}>No jobs posted yet</Text>
        ) : (
          <View style={{ marginTop: Spacing.lg }}>
            {sortedRows.map((row, i) => (
              <JobRowItem key={row.id} row={row} striped={i % 2 === 1} first={i === 0} />
            ))}
          </View>
        )}
      </SectionCard>

      {/* Compare Jobs */}
      <SectionCard padding={Spacing['2xl']}>
        <Text style={[styles.cardTitle, { color: c.textPrimary, marginBottom: 0 }]}>Compare Jobs</Text>
        <Text style={[styles.compareHint, { color: c.textSecondary }]}>Select 2–3 jobs to compare performance side by side.</Text>
        <View style={styles.chipWrap}>
          {data.jobRows.map((row) => {
            const sel = compareIds.includes(row.id);
            return (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                onPress={() => setCompareIds((prev) => toggleCompareId(prev, row.id))}
                style={[
                  styles.compareChip,
                  sel
                    ? { backgroundColor: c.indigo + '26', borderColor: c.indigo }
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text numberOfLines={1} style={[styles.compareChipLabel, { color: sel ? c.indigo : c.textSecondary }]}>
                  {row.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {compareIds.length < 2 ? (
          <Text style={[styles.emptySmall, { color: c.textSecondary }]}>Select at least 2 jobs above to compare.</Text>
        ) : (
          <View style={{ gap: Spacing.lg, marginTop: Spacing.lg }}>
            {/* Legend */}
            <View style={styles.legend}>
              {compareIds.map((id, i) => {
                const row = data.jobRows.find((r) => r.id === id);
                return (
                  <View key={id} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COMPARE_COLORS[i] }]} />
                    <Text numberOfLines={1} style={[styles.legendLabel, { color: c.textSecondary }]}>
                      {row?.title}
                    </Text>
                  </View>
                );
              })}
            </View>
            {/* Comparison bars */}
            {COMPARE_METRICS.map((metric) => {
              const bars = compareBars(data.jobRows, compareIds, metric.key);
              return (
                <View key={metric.key}>
                  <Text style={[styles.compareMetricLabel, { color: c.textSecondary }]}>{metric.label}</Text>
                  <View style={{ gap: 6 }}>
                    {bars.map((bar, i) => (
                      <View key={bar.id} style={styles.compareBarRow}>
                        <View style={[styles.compareTrack, { backgroundColor: c.canvas }]}>
                          <View style={[styles.compareFill, { width: `${bar.pct}%`, backgroundColor: COMPARE_COLORS[i] }]} />
                        </View>
                        <Text style={[styles.compareValue, { color: COMPARE_COLORS[i] }]}>
                          {bar.value}
                          {metric.key === 'fillRate' ? '%' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </HubScreen>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function DailyChart({ data, width, period }: { data: DailyApps[]; width: number; period: EnterprisePeriod }) {
  const c = useHubTheme();
  const barWidth = period === '7d' ? 28 : period === '30d' ? 10 : 6;
  const spacing = period === '7d' ? 12 : period === '30d' ? 4 : 2;
  return (
    <View style={{ marginTop: Spacing.lg }}>
      <BarChart
        data={data.map((d) => ({ value: d.count, label: d.date }))}
        width={width}
        height={200}
        barWidth={barWidth}
        spacing={spacing}
        frontColor="#4f46e5"
        barBorderRadius={4}
        yAxisColor="transparent"
        xAxisColor={c.border}
        yAxisTextStyle={{ fontSize: 10, color: c.textSecondary }}
        xAxisLabelTextStyle={{ fontSize: 8, color: c.textSecondary }}
        noOfSections={4}
        rulesColor={c.border}
        rulesType="dashed"
        isAnimated
        animationDuration={800}
      />
    </View>
  );
}

function RankedBars({ items, colour }: { items: RankedItem[]; colour: string }) {
  const c = useHubTheme();
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
      {items.map((item) => (
        <View key={item.name} style={styles.rankedRow}>
          <Text numberOfLines={1} style={[styles.rankedLabel, { color: c.textSecondary }]}>
            {item.name}
          </Text>
          <View style={[styles.rankedTrack, { backgroundColor: c.canvas }]}>
            <View style={[styles.rankedFill, { width: `${Math.max((item.count / max) * 100, 4)}%`, backgroundColor: colour }]} />
          </View>
          <Text style={[styles.rankedCount, { color: c.textPrimary }]}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

function JobRowItem({ row, striped, first }: { row: AnalyticsJobRow; striped: boolean; first: boolean }) {
  const c = useHubTheme();
  const fillColour = row.fillRate >= 50 ? c.success : row.fillRate > 0 ? c.warning : c.textSecondary;
  const statusTone = row.status === 'open' ? 'success' : row.status === 'closed' ? 'neutral' : 'indigo';
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(toHref(ROUTES.enterpriseJob(row.id)))}
      style={({ pressed }) => [
        styles.jobRow,
        { borderTopColor: c.border + '80', borderTopWidth: first ? 0 : StyleSheet.hairlineWidth },
        striped && { backgroundColor: c.canvas + '80' },
        pressed && { backgroundColor: c.canvas },
      ]}
    >
      <View style={styles.jobRowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.jobRowTitle, { color: c.textPrimary }]}>
            {row.title}
          </Text>
          <Text style={[styles.jobRowSuburb, { color: c.primary }]}>{row.suburb}</Text>
        </View>
        <TinyPill label={row.status} tone={statusTone} size="xs" />
      </View>
      <View style={styles.jobRowStats}>
        <View style={[styles.tradeTag, { backgroundColor: c.primaryBg, borderColor: c.primaryLight }]}>
          <Text style={[styles.tradeTagLabel, { color: c.primary }]}>{row.trade_category}</Text>
        </View>
        <Stat label="Apps" value={String(row.apps)} colour={c.textPrimary} bold />
        <Stat label="Views" value={String(row.views)} colour={c.textSecondary} />
        <Stat label="Fill" value={`${row.fillRate}%`} colour={fillColour} bold />
        <Stat label="1st App" value={relTime(row.firstApp)} colour={c.textSecondary} />
      </View>
    </Pressable>
  );
}

function Stat({ label, value, colour, bold }: { label: string; value: string; colour: string; bold?: boolean }) {
  const c = useHubTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colour }, bold && { fontFamily: FontFamily.bodyBold, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  displayTitle: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.display,
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.lg,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  cardTitleSm: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  emptyChart: {
    textAlign: 'center',
    paddingVertical: Spacing['5xl'],
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  emptySmall: {
    textAlign: 'center',
    paddingVertical: Spacing['2xl'],
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  rankedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rankedLabel: {
    width: 96,
    fontSize: 11,
    fontFamily: FontFamily.body,
  },
  rankedTrack: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rankedFill: {
    height: '100%',
    borderRadius: 4,
  },
  rankedCount: {
    width: 28,
    textAlign: 'right',
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  breakdownHeader: {
    gap: Spacing.md,
  },
  jobRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  jobRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobRowTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  jobRowSuburb: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  jobRowStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  tradeTag: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tradeTagLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontFamily: FontFamily.body,
  },
  compareHint: {
    marginTop: 2,
    marginBottom: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  compareChip: {
    maxWidth: 200,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  compareChipLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    maxWidth: 100,
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  compareMetricLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  compareBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  compareTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  compareFill: {
    height: '100%',
    borderRadius: 6,
  },
  compareValue: {
    width: 44,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
