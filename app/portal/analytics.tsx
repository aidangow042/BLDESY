/**
 * /portal/analytics — port of `~/bldesy-web/app/portal/analytics/page.tsx`.
 *
 * Period pills, the inbound-demand tiles (views → saves → messages → applied),
 * the outcome/quality tiles (jobs won, win rate, all-time rating, profile
 * completeness), then Applications Over Time + Top Trades / Top Locations
 * charts — exactly the datasets getTradieAnalytics() returns.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';

import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { Card, CountUp, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import {
  formatDayLabel,
  getTradieAnalytics,
  type AnalyticsPeriod,
  type TradieAnalytics,
} from '@/lib/data/analytics';
import { zoneIsLive } from '@/lib/launch-flags';
import { formatTradeName } from '@/lib/web/trades';

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
];

/* Tailwind accents the web tiles use for their left borders. */
const ACCENTS = {
  rose: '#f43f5e',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  emerald600: '#059669',
  emerald500: '#10b981',
  yellow: '#eab308',
  amber: '#f59e0b',
};

export default function PortalAnalyticsPage() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { user } = useUser();
  const { profile } = usePortal();

  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [data, setData] = useState<TradieAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  // Waitlist-honest zero states: while home jobs are gated, a 0 means "not
  // launched here yet", and the tiles say so instead of looking dead.
  const waitlistMode = !zoneIsLive('home_jobs');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setData(await getTradieAnalytics(period, user));
    } catch {
      /* keep the last good numbers */
    } finally {
      setLoading(false);
    }
  }, [user, period]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function onChartLayout(e: LayoutChangeEvent) {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartWidth) setChartWidth(w);
  }

  if (loading && !data) {
    return (
      <PortalPage>
        <Skeleton variant="card" style={{ height: 128 }} />
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <Skeleton variant="card" style={styles.skeletonTile} />
            <Skeleton variant="card" style={styles.skeletonTile} />
          </View>
          <View style={styles.gridRow}>
            <Skeleton variant="card" style={styles.skeletonTile} />
            <Skeleton variant="card" style={styles.skeletonTile} />
          </View>
        </View>
      </PortalPage>
    );
  }

  const d: TradieAnalytics = data ?? {
    period,
    profileComplete: 0,
    profileViews: 0,
    profileSaves: 0,
    messagesReceived: 0,
    totalApplications: 0,
    jobsWon: 0,
    winRate: 0,
    reviewCount: 0,
    avgRating: 0,
    dailyApplications: [],
    topTrades: [],
    topLocations: [],
  };

  const heroTiles = [
    {
      label: 'PROFILE VIEWS',
      value: d.profileViews,
      suffix: '',
      subtitle:
        d.profileViews === 0 && waitlistMode
          ? 'Counts from launch — share your profile link meanwhile'
          : 'Unique people',
      accent: c.primary,
      icon: '👁️',
    },
    {
      label: 'SAVES',
      value: d.profileSaves,
      suffix: '',
      subtitle: d.profileSaves === 0 && waitlistMode ? 'Starts when homeowners arrive' : 'Bookmarked you',
      accent: ACCENTS.rose,
      icon: '💾',
    },
    {
      label: 'MESSAGES',
      value: d.messagesReceived,
      suffix: '',
      subtitle: d.messagesReceived === 0 && waitlistMode ? 'Enquiries land here at launch' : 'Active conversations',
      accent: ACCENTS.indigo,
      icon: '💬',
    },
    {
      label: 'APPLIED',
      value: d.totalApplications,
      suffix: '',
      subtitle: d.totalApplications === 0 && waitlistMode ? 'Jobs open at launch' : 'Jobs you applied to',
      accent: ACCENTS.violet,
      icon: '💼',
    },
  ];

  const secondaryTiles = [
    { label: 'JOBS WON', value: d.jobsWon, suffix: '', subtitle: 'Accepted applications', accent: ACCENTS.emerald600, icon: '🏆' },
    { label: 'WIN RATE', value: d.winRate, suffix: '%', subtitle: 'Accepted ÷ Applied', accent: ACCENTS.emerald500, icon: '📈' },
    {
      label: 'AVG RATING',
      value: d.avgRating,
      suffix: d.avgRating > 0 ? ' ★' : '',
      subtitle:
        d.reviewCount > 0
          ? `All-time, from ${d.reviewCount} review${d.reviewCount === 1 ? '' : 's'}`
          : 'No reviews yet',
      accent: ACCENTS.yellow,
      icon: '⭐',
      // "—", not 0: no reviews is an empty state, not a zero score.
      dash: d.reviewCount === 0,
      decimals: 1,
    },
    { label: 'PROFILE', value: d.profileComplete, suffix: '%', subtitle: 'Completeness', accent: ACCENTS.amber, icon: '👤' },
  ];

  const dailyBars = d.dailyApplications.map((row) => ({ value: row.count, label: formatDayLabel(row.date) }));
  const tradeBars = d.topTrades.map((row) => ({ value: row.count, label: formatTradeName(row.name) }));
  const locationBars = d.topLocations.map((row) => ({ value: row.count, label: row.name }));
  const dense = dailyBars.length > 10;

  return (
    <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[c.primary, c.primaryDark, c.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text accessibilityRole="header" style={styles.heroTitle}>
          Analytics
        </Text>
        <Text style={styles.heroSub}>{profile?.business_name || 'Builder'} — Performance insights</Text>
        <View style={styles.periods}>
          {PERIODS.map((p) => {
            const selected = period === p.key;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setPeriod(p.key)}
                style={[styles.period, selected && { backgroundColor: '#ffffff' }]}
              >
                <Text style={[styles.periodText, { color: selected ? c.primary : 'rgba(255,255,255,0.6)' }]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* Hero metric cards — inbound demand signals */}
      <View style={styles.grid}>
        {chunk(heroTiles, 2).map((row, i) => (
          <View key={i} style={styles.gridRow}>
            {row.map((m) => (
              <MetricTile key={m.label} {...m} />
            ))}
          </View>
        ))}
      </View>

      {/* Secondary metric cards — outcome + quality + coaching */}
      <View style={styles.grid}>
        {chunk(secondaryTiles, 2).map((row, i) => (
          <View key={i} style={styles.gridRow}>
            {row.map((m) => (
              <MetricTile key={m.label} {...m} />
            ))}
          </View>
        ))}
      </View>

      {/* Applications Over Time */}
      <Card padding={Spacing['2xl']} style={styles.chartCard}>
        <Text accessibilityRole="header" style={[styles.chartTitle, { color: c.textPrimary }]}>
          Applications Over Time
        </Text>
        <View onLayout={onChartLayout}>
          {dailyBars.length === 0 ? (
            <Text style={[styles.chartEmpty, { color: c.textSecondary }]}>
              {waitlistMode
                ? 'Jobs open at launch — your applications will chart here.'
                : 'No application data for this period'}
            </Text>
          ) : chartWidth > 0 ? (
            <BarChart
              data={dailyBars}
              width={chartWidth - 36}
              height={240}
              barWidth={dense ? 10 : 22}
              spacing={dense ? 6 : 14}
              initialSpacing={8}
              yAxisLabelWidth={28}
              frontColor={c.primary}
              barBorderRadius={4}
              noOfSections={4}
              rulesColor={c.border}
              rulesType="dashed"
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={c.border}
              yAxisTextStyle={{ fontSize: 11, color: c.textSecondary }}
              xAxisLabelTextStyle={{ fontSize: 10, color: c.textSecondary }}
              isAnimated
            />
          ) : null}
        </View>
      </Card>

      {/* Top Trades + Top Locations */}
      <Card padding={Spacing['2xl']} style={styles.chartCard}>
        <Text accessibilityRole="header" style={[styles.chartTitleSm, { color: c.textPrimary }]}>
          Top Trades Applied
        </Text>
        {tradeBars.length === 0 ? (
          <Text style={[styles.chartEmptySm, { color: c.textSecondary }]}>No trade data yet</Text>
        ) : chartWidth > 0 ? (
          <HorizontalBars data={tradeBars} color={c.primary} width={chartWidth} />
        ) : null}
      </Card>
      <Card padding={Spacing['2xl']} style={styles.chartCard}>
        <Text accessibilityRole="header" style={[styles.chartTitleSm, { color: c.textPrimary }]}>
          Top Locations Applied
        </Text>
        {locationBars.length === 0 ? (
          <Text style={[styles.chartEmptySm, { color: c.textSecondary }]}>No location data yet</Text>
        ) : chartWidth > 0 ? (
          <HorizontalBars data={locationBars} color={c.indigo} width={chartWidth} />
        ) : null}
      </Card>
    </PortalPage>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function MetricTile({
  label,
  value,
  suffix,
  subtitle,
  accent,
  icon,
  dash,
  decimals,
}: {
  label: string;
  value: number;
  suffix: string;
  subtitle: string;
  accent: string;
  icon: string;
  dash?: boolean;
  decimals?: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing.lg} style={[styles.tile, { borderLeftColor: accent }]}>
      <View style={styles.tileHeader}>
        <Text style={styles.tileIcon}>{icon}</Text>
        <Text style={[styles.tileLabel, { color: c.textSecondary }]}>{label}</Text>
      </View>
      {dash ? (
        <Text style={[styles.tileValue, { color: c.textPrimary }]}>—</Text>
      ) : (
        <View style={styles.tileValueRow}>
          <CountUp
            value={value}
            duration={800}
            format={(n) => (decimals ? (Math.round(n * 10) / 10).toFixed(decimals) : String(Math.round(n)))}
            style={[styles.tileValue, { color: c.textPrimary }]}
          />
          {suffix ? <Text style={[styles.tileValue, { color: c.textPrimary }]}>{suffix}</Text> : null}
        </View>
      )}
      <Text style={[styles.tileSub, { color: c.textSecondary }]}>{subtitle}</Text>
    </Card>
  );
}

/** recharts `layout="vertical"` twin — gifted-charts' horizontal bar mode. */
function HorizontalBars({
  data,
  color,
  width,
}: {
  data: { value: number; label: string }[];
  color: string;
  width: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const labelWidth = 88; // web YAxis width={80}
  return (
    <View style={styles.horizontalWrap}>
      <BarChart
        data={data}
        horizontal
        height={Math.max(120, width - labelWidth - 56)}
        barWidth={16}
        spacing={12}
        initialSpacing={8}
        labelWidth={labelWidth}
        yAxisLabelWidth={24}
        frontColor={color}
        barBorderRadius={4}
        noOfSections={4}
        hideRules
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ fontSize: 10, color: c.textSecondary }}
        xAxisLabelTextStyle={{ fontSize: 11, color: c.textSecondary }}
        disableScroll
        isAnimated
      />
    </View>
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push([...items.slice(i, i + size)]);
  return out;
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    overflow: 'hidden',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.display,
  },
  heroSub: {
    marginTop: Spacing.xs,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  periods: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.xs,
  },
  period: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  periodText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  grid: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  skeletonTile: {
    flex: 1,
    height: 112,
    width: undefined,
  },
  tile: {
    flex: 1,
    borderLeftWidth: 3,
    borderRadius: Radius.lg,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tileIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  tileLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tileValue: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tileSub: {
    marginTop: Spacing.xs,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FontFamily.body,
  },
  chartCard: {
    borderRadius: Radius.lg,
  },
  chartTitle: {
    marginBottom: Spacing.lg,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  chartTitleSm: {
    marginBottom: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  chartEmpty: {
    paddingVertical: Spacing['5xl'],
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.body,
  },
  chartEmptySm: {
    paddingVertical: Spacing['2xl'],
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  horizontalWrap: {
    overflow: 'hidden',
  },
});
