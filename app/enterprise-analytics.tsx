/**
 * Enterprise Analytics — comprehensive job performance dashboard.
 * Period-filtered metrics, charts, per-job breakdown, and comparison.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BarChart } from 'react-native-gifted-charts';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';

// ── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';

type Metrics = {
  jobViews: number;
  applications: number;
  viewToApplyRate: number;
  fillRate: number;
  jobsPosted: number;
  avgAppsPerJob: number;
  positionsFilled: number;
  workersNeeded: number;
};

type DailyApps = { date: string; count: number };
type RankedItem = { label: string; count: number };
type JobRow = {
  id: string;
  title: string;
  trade_category: string;
  status: string;
  workers_needed: number;
  apps: number;
  views: number;
  fillRate: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
];
const COMPARE_COLORS = ['#4f46e5', '#0d9488', '#d97706'];
const EMPTY_METRICS: Metrics = { jobViews: 0, applications: 0, viewToApplyRate: 0, fillRate: 0, jobsPosted: 0, avgAppsPerJob: 0, positionsFilled: 0, workersNeeded: 0 };

function periodCutoff(p: Period): string | null {
  if (p === 'all') return null;
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en-AU', { month: 'short' })}`;
}

// ── CountUp ──────────────────────────────────────────────────────────────────

function CountUp({ to, color, suffix = '' }: { to: number; color: string; suffix?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: to, duration: 800, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setDisplay(suffix === '%' ? Math.round(value) : Math.round(value * 10) / 10));
    return () => anim.removeListener(id);
  }, [to]);
  return <Text style={[styles.mVal, { color }]}>{display}{suffix}</Text>;
}

// ── HorizontalBar ────────────────────────────────────────────────────────────

function HBar({ label, value, maxValue, color, bgColor, textColor }: { label: string; value: number; maxValue: number; color: string; bgColor: string; textColor: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <View style={styles.hRow}>
      <Text style={[styles.hLabel, { color: textColor }]} numberOfLines={1}>{label}</Text>
      <View style={[styles.hTrack, { backgroundColor: bgColor }]}>
        <View style={[styles.hFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color, borderRadius: 3 }]} />
      </View>
      <Text style={[styles.hCount, { color }]}>{value}</Text>
    </View>
  );
}

// ── Data Hook ────────────────────────────────────────────────────────────────

function useAnalyticsData(period: Period) {
  const { userId } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [dailyApps, setDailyApps] = useState<DailyApps[]>([]);
  const [topTrades, setTopTrades] = useState<RankedItem[]>([]);
  const [topLocations, setTopLocations] = useState<RankedItem[]>([]);
  const [jobRows, setJobRows] = useState<JobRow[]>([]);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const { data: jobs } = await supabase.from('jobs')
      .select('id, title, trade_category, status, workers_needed, created_at')
      .eq('customer_id', userId);

    const allJobs = jobs || [];
    const jobIds = allJobs.map(j => j.id);

    if (jobIds.length === 0) {
      setMetrics(EMPTY_METRICS); setDailyApps([]); setTopTrades([]); setTopLocations([]); setJobRows([]);
      setLoading(false); return;
    }

    const cutoff = periodCutoff(period);

    // Fetch apps + views + builder profiles in parallel
    const appsQ = supabase.from('applications')
      .select('id, status, created_at, job_id, builder_id')
      .in('job_id', jobIds).order('created_at', { ascending: true });
    if (cutoff) appsQ.gte('created_at', cutoff);

    let viewsPromise: Promise<any> = Promise.resolve({ data: [], error: null });
    try {
      const vQ = supabase.from('job_views').select('job_id, created_at').in('job_id', jobIds);
      if (cutoff) vQ.gte('created_at', cutoff);
      viewsPromise = vQ;
    } catch { /* table may not exist */ }

    const [appsRes, viewsRes] = await Promise.all([appsQ, viewsPromise]);
    const allApps: any[] = appsRes.data || [];
    const allViews: any[] = (viewsRes as any)?.data || [];

    // Builder profiles for trade/location
    const builderIds = [...new Set(allApps.map((a: any) => a.builder_id))];
    const builderMap = new Map<string, { trade: string; suburb: string }>();
    if (builderIds.length > 0) {
      const { data: bp } = await supabase.from('builder_profiles')
        .select('user_id, trade_category, suburb').in('user_id', builderIds);
      for (const p of bp || []) builderMap.set(p.user_id, { trade: p.trade_category, suburb: p.suburb });
    }

    // Metrics
    const accepted = allApps.filter((a: any) => a.status === 'accepted').length;
    const totalPositions = allJobs.reduce((s, j: any) => s + (j.workers_needed || 1), 0);
    setMetrics({
      jobViews: allViews.length,
      applications: allApps.length,
      viewToApplyRate: allViews.length > 0 ? Math.round((allApps.length / allViews.length) * 100) : 0,
      fillRate: totalPositions > 0 ? Math.round((accepted / totalPositions) * 100) : 0,
      jobsPosted: allJobs.length,
      avgAppsPerJob: allJobs.length > 0 ? Math.round((allApps.length / allJobs.length) * 10) / 10 : 0,
      positionsFilled: accepted,
      workersNeeded: totalPositions,
    });

    // Daily apps
    const dayMap: Record<string, number> = {};
    for (const a of allApps) { const d = a.created_at.slice(0, 10); dayMap[d] = (dayMap[d] || 0) + 1; }
    setDailyApps(Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })));

    // Top trades
    const tc: Record<string, number> = {};
    for (const a of allApps) { const t = builderMap.get(a.builder_id)?.trade || 'Unknown'; tc[t] = (tc[t] || 0) + 1; }
    setTopTrades(Object.entries(tc).sort(([, a], [, b]) => b - a).slice(0, 5).map(([label, count]) => ({ label, count })));

    // Top locations
    const lc: Record<string, number> = {};
    for (const a of allApps) { const l = builderMap.get(a.builder_id)?.suburb || 'Unknown'; lc[l] = (lc[l] || 0) + 1; }
    setTopLocations(Object.entries(lc).sort(([, a], [, b]) => b - a).slice(0, 5).map(([label, count]) => ({ label, count })));

    // Job rows
    setJobRows(allJobs.map((j: any) => {
      const jApps = allApps.filter((a: any) => a.job_id === j.id);
      const jViews = allViews.filter((v: any) => v.job_id === j.id).length;
      const jAcc = jApps.filter((a: any) => a.status === 'accepted').length;
      const wn = j.workers_needed || 1;
      return { id: j.id, title: j.title, trade_category: j.trade_category, status: j.status, workers_needed: wn, apps: jApps.length, views: jViews, fillRate: wn > 0 ? Math.round((jAcc / wn) * 100) : 0 };
    }).sort((a, b) => b.apps - a.apps));

    setLoading(false);
  }, [period, userId]);

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return { loading, refreshing, metrics, dailyApps, topTrades, topLocations, jobRows, load, refresh };
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function EnterpriseAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';
  const teal = isDark ? '#2dd4bf' : '#0d9488';
  const tealBg = isDark ? 'rgba(45,212,191,0.08)' : 'rgba(13,148,136,0.06)';
  const cardBg = isDark ? colors.surface : '#fff';
  const cardBorder = isDark ? colors.border : '#e2e8f0';

  const [period, setPeriod] = useState<Period>('30d');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { loading, refreshing, metrics, dailyApps, topTrades, topLocations, jobRows, load, refresh } = useAnalyticsData(period);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={[styles.container, { backgroundColor: colors.canvas }]}><ActivityIndicator color={indigo} style={{ marginTop: 100 }} /></View>;
  }

  // Chart data
  const barData = dailyApps.map((d, i) => ({
    value: d.count,
    label: i % (period === '7d' ? 1 : period === '30d' ? 7 : 14) === 0 ? fmtDate(d.date) : '',
    frontColor: indigo,
    topLabelComponent: () => d.count > 0 ? <Text style={{ fontSize: 9, color: indigo, fontWeight: '700', marginBottom: 2 }}>{d.count}</Text> : null,
  }));

  const metricCards: { label: string; value: number; icon: React.ComponentProps<typeof Ionicons>['name']; accent: string; suffix: string }[] = [
    { label: 'JOB VIEWS', value: metrics.jobViews, icon: 'eye-outline', accent: '#4f46e5', suffix: '' },
    { label: 'APPLICATIONS', value: metrics.applications, icon: 'people-outline', accent: '#0d9488', suffix: '' },
    { label: 'VIEW→APPLY', value: metrics.viewToApplyRate, icon: 'trending-up-outline', accent: '#6366f1', suffix: '%' },
    { label: 'FILL RATE', value: metrics.fillRate, icon: 'checkmark-done-outline', accent: '#059669', suffix: '%' },
    { label: 'JOBS POSTED', value: metrics.jobsPosted, icon: 'briefcase-outline', accent: '#d97706', suffix: '' },
    { label: 'AVG APPS/JOB', value: metrics.avgAppsPerJob, icon: 'stats-chart-outline', accent: '#8b5cf6', suffix: '' },
    { label: 'FILLED', value: metrics.positionsFilled, icon: 'shield-checkmark-outline', accent: '#059669', suffix: '' },
    { label: 'NEEDED', value: metrics.workersNeeded, icon: 'hammer-outline', accent: '#dc2626', suffix: '' },
  ];

  const maxTrade = topTrades[0]?.count || 1;
  const maxLoc = topLocations[0]?.count || 1;

  function toggleCompare(id: string) {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient colors={isDark ? ['#1e1b4b', '#312e81', '#3730a3'] : ['#4338ca', '#4f46e5', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Job Analytics</Text>
            <Text style={styles.headerSub}>Performance insights</Text>
          </View>
        </View>
        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.periodPill, period === p.key && styles.periodPillActive]}>
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={indigo} />}>

        {/* 8 Metric Cards */}
        <View style={styles.mGrid}>
          {metricCards.map(m => (
            <View key={m.label} style={[styles.mCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.mAccent, { backgroundColor: m.accent }]} />
              <View style={[styles.mIconWrap, { backgroundColor: m.accent + '10' }]}>
                <Ionicons name={m.icon} size={14} color={m.accent} />
              </View>
              <Text style={[styles.mLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              <CountUp to={m.value} color={isDark ? colors.text : '#0f172a'} suffix={m.suffix} />
            </View>
          ))}
        </View>

        {/* Applications Over Time */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Applications Over Time</Text>
          {barData.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No application data for this period</Text>
          ) : (
            <View style={styles.chartWrap}>
              <BarChart
                data={barData}
                width={CHART_WIDTH}
                height={160}
                barWidth={period === '7d' ? 28 : period === '30d' ? 8 : 4}
                spacing={period === '7d' ? 8 : period === '30d' ? 3 : 1}
                yAxisColor="transparent"
                xAxisColor={cardBorder}
                yAxisTextStyle={{ fontSize: 10, color: colors.textSecondary }}
                xAxisLabelTextStyle={{ fontSize: 8, color: colors.textSecondary }}
                noOfSections={4}
                rulesColor={cardBorder}
                rulesType="dashed"
                barBorderRadius={3}
                isAnimated
                animationDuration={600}
              />
            </View>
          )}
        </View>

        {/* Side-by-side: Top Trades + Top Locations */}
        <View style={styles.sideBySide}>
          <View style={[styles.card, styles.halfCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.secTitleSm, { color: colors.text }]}>Top Trades Applying</Text>
            {topTrades.length === 0 ? (
              <Text style={[styles.emptyTextSm, { color: colors.textSecondary }]}>No data</Text>
            ) : topTrades.map(t => (
              <HBar key={t.label} label={t.label} value={t.count} maxValue={maxTrade} color={teal} bgColor={tealBg} textColor={colors.textSecondary} />
            ))}
          </View>
          <View style={[styles.card, styles.halfCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.secTitleSm, { color: colors.text }]}>Top Locations</Text>
            {topLocations.length === 0 ? (
              <Text style={[styles.emptyTextSm, { color: colors.textSecondary }]}>No data</Text>
            ) : topLocations.map(l => (
              <HBar key={l.label} label={l.label} value={l.count} maxValue={maxLoc} color={indigo} bgColor={indigoBg} textColor={colors.textSecondary} />
            ))}
          </View>
        </View>

        {/* Per-Job Breakdown */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Per-Job Breakdown</Text>
          {jobRows.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No jobs to show</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                {/* Header */}
                <View style={[styles.tRow, styles.tHeader, { borderBottomColor: cardBorder }]}>
                  <Text style={[styles.tCell, styles.tCellTitle, { color: colors.textSecondary }]}>Job</Text>
                  <Text style={[styles.tCell, styles.tCellSm, { color: colors.textSecondary }]}>Trade</Text>
                  <Text style={[styles.tCell, styles.tCellSm, { color: colors.textSecondary }]}>Status</Text>
                  <Text style={[styles.tCell, styles.tCellNum, { color: colors.textSecondary }]}>Apps</Text>
                  <Text style={[styles.tCell, styles.tCellNum, { color: colors.textSecondary }]}>Views</Text>
                  <Text style={[styles.tCell, styles.tCellNum, { color: colors.textSecondary }]}>Fill %</Text>
                </View>
                {/* Rows */}
                {jobRows.map((row, i) => (
                  <Pressable key={row.id} onPress={() => router.push({ pathname: '/job-detail', params: { id: row.id } } as any)} style={[styles.tRow, { backgroundColor: i % 2 === 1 ? (isDark ? 'rgba(255,255,255,0.02)' : '#fafafa') : 'transparent', borderBottomColor: cardBorder }]}>
                    <Text style={[styles.tCell, styles.tCellTitle, { color: colors.text }]} numberOfLines={1}>{row.title}</Text>
                    <View style={[styles.tCell, styles.tCellSm]}>
                      <View style={[styles.tradePill, { backgroundColor: tealBg }]}>
                        <Text style={[styles.tradePillText, { color: teal }]}>{row.trade_category}</Text>
                      </View>
                    </View>
                    <View style={[styles.tCell, styles.tCellSm]}>
                      <View style={[styles.statusDot, { backgroundColor: row.status === 'open' ? '#059669' : row.status === 'closed' ? '#64748b' : '#d97706' }]} />
                      <Text style={[styles.tCellText, { color: colors.textSecondary }]}>{row.status}</Text>
                    </View>
                    <Text style={[styles.tCell, styles.tCellNum, { color: colors.text, fontWeight: '700' }]}>{row.apps}</Text>
                    <Text style={[styles.tCell, styles.tCellNum, { color: colors.text }]}>{row.views}</Text>
                    <Text style={[styles.tCell, styles.tCellNum, { color: row.fillRate >= 50 ? teal : row.fillRate > 0 ? '#d97706' : colors.textSecondary, fontWeight: '700' }]}>{row.fillRate}%</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Compare Jobs */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Compare Jobs</Text>
          <Text style={[styles.secDesc, { color: colors.textSecondary }]}>Select 2-3 jobs to compare side by side</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.comparePills}>
            {jobRows.map(row => {
              const sel = compareIds.includes(row.id);
              return (
                <Pressable key={row.id} onPress={() => toggleCompare(row.id)} style={[styles.cPill, { backgroundColor: sel ? indigo : 'transparent', borderColor: sel ? indigo : cardBorder }]}>
                  <Text style={[styles.cPillText, { color: sel ? '#fff' : colors.text }]} numberOfLines={1}>{row.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {compareIds.length < 2 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: Spacing.md }]}>Select at least 2 jobs above to compare</Text>
          ) : (
            <View style={styles.compareGrid}>
              {/* Legend */}
              <View style={styles.legend}>
                {compareIds.map((id, i) => {
                  const row = jobRows.find(r => r.id === id);
                  return (
                    <View key={id} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: COMPARE_COLORS[i] }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>{row?.title?.slice(0, 15)}</Text>
                    </View>
                  );
                })}
              </View>
              {/* Bars per metric */}
              {(['apps', 'views', 'fillRate'] as const).map(metric => {
                const label = metric === 'apps' ? 'Applications' : metric === 'views' ? 'Views' : 'Fill Rate';
                const vals = compareIds.map(id => { const r = jobRows.find(x => x.id === id); return r ? r[metric] : 0; });
                const max = Math.max(...vals, 1);
                return (
                  <View key={metric} style={styles.compareSection}>
                    <Text style={[styles.compareLabel, { color: colors.textSecondary }]}>{label}</Text>
                    {compareIds.map((id, i) => {
                      const val = vals[i];
                      const pct = (val / max) * 100;
                      return (
                        <View key={id} style={styles.compareBarRow}>
                          <View style={[styles.compareTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }]}>
                            <View style={[styles.compareFill, { width: `${Math.max(pct, 3)}%`, backgroundColor: COMPARE_COLORS[i] }]} />
                          </View>
                          <Text style={[styles.compareVal, { color: COMPARE_COLORS[i] }]}>{val}{metric === 'fillRate' ? '%' : ''}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  android: { elevation: 2 },
  default: {},
}) as Record<string, any>;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'RussoOne_400Regular', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500', marginTop: 1 },
  periodRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.md },
  periodPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  periodPillActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  periodText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },

  // Metrics grid (2 rows × 4)
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mCard: { width: (SCREEN_WIDTH - 32 - 18) / 4, borderWidth: 1, borderRadius: 12, padding: 8, gap: 3, overflow: 'hidden', ...CARD_SHADOW },
  mAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  mIconWrap: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  mVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  // Cards
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg, ...CARD_SHADOW },
  secTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: Spacing.md },
  secTitleSm: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, marginBottom: Spacing.sm },
  secDesc: { fontSize: 12, marginBottom: Spacing.sm },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: Spacing.xl },
  emptyTextSm: { fontSize: 12, textAlign: 'center', paddingVertical: Spacing.md },
  chartWrap: { marginLeft: -8, overflow: 'hidden' },

  // Side-by-side
  sideBySide: { flexDirection: 'row', gap: Spacing.sm },
  halfCard: { flex: 1 },

  // Horizontal bars
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  hLabel: { width: 60, fontSize: 11, fontWeight: '500' },
  hTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  hFill: { height: 8 },
  hCount: { width: 24, fontSize: 11, fontWeight: '700', textAlign: 'right' },

  // Table
  tRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center', minHeight: 40 },
  tHeader: { borderBottomWidth: 1 },
  tCell: { paddingHorizontal: 6, paddingVertical: 8, fontSize: 12 },
  tCellTitle: { width: 140 },
  tCellSm: { width: 90, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tCellNum: { width: 50, textAlign: 'right', fontWeight: '500' },
  tCellText: { fontSize: 11 },
  tradePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tradePillText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // Compare
  comparePills: { gap: 6, paddingVertical: Spacing.xs },
  cPill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 140 },
  cPillText: { fontSize: 12, fontWeight: '600' },
  compareGrid: { marginTop: Spacing.md, gap: Spacing.md },
  legend: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500', maxWidth: 80 },
  compareSection: { gap: 4 },
  compareLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  compareBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compareTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  compareFill: { height: 10, borderRadius: 5 },
  compareVal: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
