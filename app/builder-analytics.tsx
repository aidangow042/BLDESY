/**
 * Builder Analytics — comprehensive performance dashboard.
 * Period-filtered metrics, charts, keyword/traffic breakdown.
 * Matches the enterprise analytics design but with builder-specific stats.
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

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';

// ── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';
type Metrics = {
  profileViews: number;
  applications: number;
  acceptanceRate: number;
  responseTime: number;
  searchAppearances: number;
  jobsApplied: number;
  jobsWon: number;
  profileCompleteness: number;
};
type DailyViews = { date: string; count: number };
type RankedItem = { label: string; count: number };

// ── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
];
const EMPTY: Metrics = { profileViews: 0, applications: 0, acceptanceRate: 0, responseTime: 0, searchAppearances: 0, jobsApplied: 0, jobsWon: 0, profileCompleteness: 0 };

// Profile-level stats — these require analytics tables not yet built.
// Shown as empty until profile_views and search_analytics tables are created.
const topKeywords: { keyword: string; count: number }[] = [];
const trafficSources: { source: string; percent: number; icon: 'search-outline' | 'map-outline' | 'sparkles-outline' | 'link-outline' }[] = [];
const competitorData = { yourViews: 0, avgViews: 0, yourQuotes: 0, avgQuotes: 0 };

function periodCutoff(p: Period): string | null {
  if (p === 'all') return null;
  const d = p === '7d' ? 7 : p === '30d' ? 30 : 90;
  return new Date(Date.now() - d * 86_400_000).toISOString();
}
function fmtDate(iso: string) { const d = new Date(iso); return `${d.getDate()} ${d.toLocaleString('en-AU', { month: 'short' })}`; }

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

function useBuilderAnalytics(period: Period) {
  const { userId } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);
  const [dailyApps, setDailyApps] = useState<DailyViews[]>([]);
  const [topTrades, setTopTrades] = useState<RankedItem[]>([]);
  const [topLocations, setTopLocations] = useState<RankedItem[]>([]);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const cutoff = periodCutoff(period);

    // Fetch builder profile for completeness
    const { data: profile } = await supabase.from('builder_profiles')
      .select('business_name, bio, phone, cover_photo_url, profile_photo_url, specialties, projects, abn, license_key, website')
      .eq('user_id', userId).single();

    // Profile completeness
    let complete = 0;
    if (profile) {
      const checks = [profile.business_name, profile.bio, profile.phone, profile.cover_photo_url, profile.profile_photo_url,
        Array.isArray(profile.specialties) && profile.specialties.length > 0, Array.isArray(profile.projects) && profile.projects.length > 0,
        profile.abn, profile.license_key, profile.website];
      complete = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    }

    // Fetch applications
    let appsQ = supabase.from('applications').select('id, status, created_at, job_id').eq('builder_id', userId).order('created_at', { ascending: true });
    if (cutoff) appsQ = appsQ.gte('created_at', cutoff);
    const { data: apps } = await appsQ;
    const allApps = apps || [];

    const accepted = allApps.filter((a: any) => a.status === 'accepted').length;

    // Fetch job details for trade/location breakdown
    const jobIds = [...new Set(allApps.map((a: any) => a.job_id))];
    const jobMap = new Map<string, { trade: string; suburb: string }>();
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase.from('jobs').select('id, trade_category, suburb').in('id', jobIds);
      for (const j of jobs || []) jobMap.set(j.id, { trade: j.trade_category, suburb: j.suburb });
    }

    setMetrics({
      profileViews: 0, // Would need job_views or profile_views table
      applications: allApps.length,
      acceptanceRate: allApps.length > 0 ? Math.round((accepted / allApps.length) * 100) : 0,
      responseTime: 0,
      searchAppearances: 0,
      jobsApplied: allApps.length,
      jobsWon: accepted,
      profileCompleteness: complete,
    });

    // Daily applications
    const dayMap: Record<string, number> = {};
    for (const a of allApps) { const d = (a as any).created_at.slice(0, 10); dayMap[d] = (dayMap[d] || 0) + 1; }
    setDailyApps(Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })));

    // Top trades applied to
    const tc: Record<string, number> = {};
    for (const a of allApps) { const j = jobMap.get((a as any).job_id); const t = j?.trade || 'Unknown'; tc[t] = (tc[t] || 0) + 1; }
    setTopTrades(Object.entries(tc).sort(([, a], [, b]) => b - a).slice(0, 5).map(([label, count]) => ({ label, count })));

    // Top locations applied to
    const lc: Record<string, number> = {};
    for (const a of allApps) { const j = jobMap.get((a as any).job_id); const l = j?.suburb || 'Unknown'; lc[l] = (lc[l] || 0) + 1; }
    setTopLocations(Object.entries(lc).sort(([, a], [, b]) => b - a).slice(0, 5).map(([label, count]) => ({ label, count })));

    setLoading(false);
  }, [period, userId]);

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return { loading, refreshing, metrics, dailyApps, topTrades, topLocations, load, refresh };
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function BuilderAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const teal = isDark ? '#2dd4bf' : '#0d9488';
  const tealBg = isDark ? 'rgba(45,212,191,0.08)' : 'rgba(13,148,136,0.06)';
  const cardBg = isDark ? colors.surface : '#fff';
  const cardBorder = isDark ? colors.border : '#e2e8f0';

  const [period, setPeriod] = useState<Period>('30d');
  const { loading, refreshing, metrics, dailyApps, topTrades, topLocations, load, refresh } = useBuilderAnalytics(period);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={[styles.container, { backgroundColor: colors.canvas }]}><ActivityIndicator color={teal} style={{ marginTop: 100 }} /></View>;
  }

  const barData = dailyApps.map((d, i) => ({
    value: d.count,
    label: i % (period === '7d' ? 1 : period === '30d' ? 7 : 14) === 0 ? fmtDate(d.date) : '',
    frontColor: teal,
    topLabelComponent: () => d.count > 0 ? <Text style={{ fontSize: 9, color: teal, fontWeight: '700', marginBottom: 2 }}>{d.count}</Text> : null,
  }));

  const metricCards: { label: string; value: number; icon: React.ComponentProps<typeof Ionicons>['name']; accent: string; suffix: string }[] = [
    { label: 'APPLICATIONS', value: metrics.applications, icon: 'document-text-outline', accent: teal, suffix: '' },
    { label: 'JOBS WON', value: metrics.jobsWon, icon: 'trophy-outline', accent: '#059669', suffix: '' },
    { label: 'WIN RATE', value: metrics.acceptanceRate, icon: 'trending-up-outline', accent: '#6366f1', suffix: '%' },
    { label: 'PROFILE', value: metrics.profileCompleteness, icon: 'person-outline', accent: '#d97706', suffix: '%' },
    { label: 'APPLIED TO', value: metrics.jobsApplied, icon: 'briefcase-outline', accent: teal, suffix: '' },
    { label: 'ACCEPTED', value: metrics.jobsWon, icon: 'checkmark-circle-outline', accent: '#059669', suffix: '' },
    { label: 'PENDING', value: metrics.applications - metrics.jobsWon, icon: 'time-outline', accent: '#d97706', suffix: '' },
    { label: 'VIEWS', value: metrics.profileViews, icon: 'eye-outline', accent: '#8b5cf6', suffix: '' },
  ];

  const maxTrade = topTrades[0]?.count || 1;
  const maxLoc = topLocations[0]?.count || 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient colors={isDark ? ['#134E4A', '#0D3B3B', '#115E59'] : ['#0D7C66', '#0A6B58', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSub}>Your performance insights</Text>
          </View>
        </View>
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.periodPill, period === p.key && styles.periodPillActive]}>
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={teal} />}>

        {/* ═══ PROFILE ANALYTICS ═══ */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Profile Analytics</Text>

        {/* Profile metric cards */}
        <View style={styles.mGrid}>
          {([
            { label: 'PROFILE', value: metrics.profileCompleteness, icon: 'person-outline' as const, accent: teal, suffix: '%' },
            { label: 'VIEWS', value: metrics.profileViews, icon: 'eye-outline' as const, accent: '#8b5cf6', suffix: '' },
            { label: 'SEARCHES', value: metrics.searchAppearances, icon: 'search-outline' as const, accent: '#d97706', suffix: '' },
            { label: 'WIN RATE', value: metrics.acceptanceRate, icon: 'trending-up-outline' as const, accent: '#059669', suffix: '%' },
          ]).map(m => (
            <View key={m.label} style={[styles.mCard, styles.mCardWide, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.mAccent, { backgroundColor: m.accent }]} />
              <View style={[styles.mIconWrap, { backgroundColor: m.accent + '10' }]}>
                <Ionicons name={m.icon} size={14} color={m.accent} />
              </View>
              <Text style={[styles.mLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              <CountUp to={m.value} color={isDark ? colors.text : '#0f172a'} suffix={m.suffix} />
            </View>
          ))}
        </View>

        {/* Top Search Keywords */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Top Search Keywords</Text>
          {topKeywords.map((kw, i) => {
            const maxKw = topKeywords[0]?.count || 1;
            const pct = (kw.count / maxKw) * 100;
            return (
              <View key={kw.keyword} style={styles.kwRow}>
                <Text style={[styles.kwRank, { color: teal }]}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.kwBarTrack, { backgroundColor: tealBg }]}>
                    <View style={[styles.kwBarFill, { width: `${pct}%`, backgroundColor: teal }]} />
                    <Text style={[styles.kwText, { color: colors.text }]} numberOfLines={1}>{kw.keyword}</Text>
                  </View>
                </View>
                <Text style={[styles.kwCount, { color: teal }]}>{kw.count}</Text>
              </View>
            );
          })}
        </View>

        {/* Traffic Sources */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Traffic Sources</Text>
          {trafficSources.map(src => (
            <View key={src.source} style={styles.srcRow}>
              <View style={[styles.srcIcon, { backgroundColor: tealBg }]}>
                <Ionicons name={src.icon} size={16} color={teal} />
              </View>
              <Text style={[styles.srcLabel, { color: colors.text }]}>{src.source}</Text>
              <View style={[styles.srcBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }]}>
                <View style={[styles.srcBarFill, { width: `${src.percent}%`, backgroundColor: teal }]} />
              </View>
              <Text style={[styles.srcPct, { color: teal }]}>{src.percent}%</Text>
            </View>
          ))}
        </View>

        {/* Competitor Comparison */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>How You Compare</Text>
          <View style={styles.compGrid}>
            {[
              { header: 'You', value: competitorData.yourViews, label: 'Views', highlight: true },
              { header: 'Average', value: competitorData.avgViews, label: 'Views', highlight: false },
              { header: 'You', value: competitorData.yourQuotes, label: 'Quotes', highlight: true },
              { header: 'Average', value: competitorData.avgQuotes, label: 'Quotes', highlight: false },
            ].map((c, i) => (
              <View key={i} style={styles.compCol}>
                <Text style={[styles.compHeader, { color: c.highlight ? teal : colors.textSecondary }]}>{c.header}</Text>
                <Text style={[styles.compVal, { color: c.highlight ? colors.text : colors.textSecondary }]}>{c.value}</Text>
                <Text style={[styles.compLabel, { color: colors.textSecondary }]}>{c.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.compBanner, { backgroundColor: tealBg }]}>
            <Ionicons name="trending-up" size={16} color={teal} />
            <Text style={[styles.compBannerText, { color: teal }]}>
              You're outperforming {Math.round(((competitorData.yourViews - competitorData.avgViews) / competitorData.avgViews) * 100)}% above average
            </Text>
          </View>
        </View>

        {/* ═══ DIVIDER ═══ */}
        <View style={[styles.divider, { borderColor: cardBorder }]} />

        {/* ═══ JOB ANALYTICS ═══ */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Job Analytics</Text>

        {/* Job metric cards */}
        <View style={styles.mGrid}>
          {([
            { label: 'APPLIED', value: metrics.jobsApplied, icon: 'briefcase-outline' as const, accent: teal, suffix: '' },
            { label: 'WON', value: metrics.jobsWon, icon: 'trophy-outline' as const, accent: '#059669', suffix: '' },
            { label: 'PENDING', value: metrics.applications - metrics.jobsWon, icon: 'time-outline' as const, accent: '#d97706', suffix: '' },
            { label: 'ACCEPTED', value: metrics.jobsWon, icon: 'checkmark-circle-outline' as const, accent: '#059669', suffix: '' },
          ]).map(m => (
            <View key={m.label} style={[styles.mCard, styles.mCardWide, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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
            <Text style={[styles.secTitleSm, { color: colors.text }]}>Top Trades Applied</Text>
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
              <HBar key={l.label} label={l.label} value={l.count} maxValue={maxLoc} color={isDark ? '#818cf8' : '#4f46e5'} bgColor={isDark ? '#1e1b4b' : '#eef2ff'} textColor={colors.textSecondary} />
            ))}
          </View>
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
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'RussoOne_400Regular', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500', marginTop: 1 },
  periodRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.md },
  periodPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  periodPillActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  periodText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },

  sectionHeading: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: Spacing.xs },
  divider: { borderTopWidth: 1, marginVertical: Spacing.sm },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mCard: { width: (SCREEN_WIDTH - 32 - 18) / 4, borderWidth: 1, borderRadius: 12, padding: 8, gap: 3, overflow: 'hidden', ...CARD_SHADOW },
  mCardWide: { width: (SCREEN_WIDTH - 32 - 6) / 2 - 3 },
  mAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  mIconWrap: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  mVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.lg, ...CARD_SHADOW },
  secTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: Spacing.md },
  secTitleSm: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, marginBottom: Spacing.sm },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: Spacing.xl },
  emptyTextSm: { fontSize: 12, textAlign: 'center', paddingVertical: Spacing.md },
  chartWrap: { marginLeft: -8, overflow: 'hidden' },

  sideBySide: { flexDirection: 'row', gap: Spacing.sm },
  halfCard: { flex: 1 },

  // Keywords
  kwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kwRank: { fontSize: 12, fontWeight: '800', width: 24 },
  kwBarTrack: { height: 28, borderRadius: 6, overflow: 'hidden', justifyContent: 'center' },
  kwBarFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 6, opacity: 0.15 },
  kwText: { fontSize: 12, fontWeight: '500', paddingHorizontal: 8 },
  kwCount: { fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },

  // Traffic sources
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  srcIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  srcLabel: { fontSize: 13, fontWeight: '600', width: 90 },
  srcBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  srcBarFill: { height: 8, borderRadius: 4 },
  srcPct: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },

  // Competitor comparison
  compGrid: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  compCol: { flex: 1, alignItems: 'center', gap: 2 },
  compHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  compVal: { fontSize: 24, fontWeight: '800' },
  compLabel: { fontSize: 11, fontWeight: '500' },
  compBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, borderRadius: 10 },
  compBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  hRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  hLabel: { width: 60, fontSize: 11, fontWeight: '500' },
  hTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  hFill: { height: 8 },
  hCount: { width: 24, fontSize: 11, fontWeight: '700', textAlign: 'right' },
});
