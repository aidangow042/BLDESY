/**
 * Enterprise Analytics -- performance metrics, job breakdowns, and recent activity.
 * Loads real data from Supabase on focus.
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Metrics = {
  totalJobs: number;
  totalApplications: number;
  acceptanceRate: number;
  avgAppsPerJob: number;
};

type TradeBreakdown = { trade: string; count: number };

type RecentApplication = {
  id: string;
  status: string;
  created_at: string;
  builder_name: string | null;
  job_title: string | null;
};

export default function EnterpriseAnalyticsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({ totalJobs: 0, totalApplications: 0, acceptanceRate: 0, avgAppsPerJob: 0 });
  const [tradeBreakdown, setTradeBreakdown] = useState<TradeBreakdown[]>([]);
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, trade_category, status')
      .eq('customer_id', user.id);

    const allJobs = jobs || [];
    const jobIds = allJobs.map(j => j.id);

    // Fetch applications for these jobs
    let allApps: any[] = [];
    if (jobIds.length > 0) {
      const { data: apps } = await supabase
        .from('applications')
        .select('id, status, created_at, job_id')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      allApps = apps || [];
    }

    // Compute metrics
    const totalJobs = allJobs.length;
    const totalApplications = allApps.length;
    const accepted = allApps.filter(a => a.status === 'accepted').length;
    const acceptanceRate = totalApplications > 0 ? Math.round((accepted / totalApplications) * 100) : 0;
    const avgAppsPerJob = totalJobs > 0 ? Math.round((totalApplications / totalJobs) * 10) / 10 : 0;

    setMetrics({ totalJobs, totalApplications, acceptanceRate, avgAppsPerJob });

    // Trade category breakdown
    const tradeCounts: Record<string, number> = {};
    for (const job of allJobs) {
      const cat = job.trade_category || 'Uncategorised';
      tradeCounts[cat] = (tradeCounts[cat] || 0) + 1;
    }
    const sorted = Object.entries(tradeCounts)
      .map(([trade, count]) => ({ trade, count }))
      .sort((a, b) => b.count - a.count);
    setTradeBreakdown(sorted);

    // Recent applications (last 10) -- fetch builder names
    const recent = allApps.slice(0, 10);
    const recentWithDetails: RecentApplication[] = recent.map(app => {
      const job = allJobs.find(j => j.id === app.job_id);
      return {
        id: app.id,
        status: app.status,
        created_at: app.created_at,
        builder_name: null,
        job_title: job?.title || 'Untitled Job',
      };
    });
    setRecentApps(recentWithDetails);

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function statusColor(status: string) {
    switch (status) {
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      case 'withdrawn': return colors.warning;
      default: return indigo;
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'withdrawn': return 'Withdrawn';
      case 'pending': return 'Pending';
      default: return status;
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={indigo} style={{ marginTop: 100 }} />
      </View>
    );
  }

  const metricCards: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }[] = [
    { label: 'Total Jobs', value: String(metrics.totalJobs), icon: 'briefcase-outline', color: indigo },
    { label: 'Applications', value: String(metrics.totalApplications), icon: 'people-outline', color: colors.teal },
    { label: 'Acceptance Rate', value: `${metrics.acceptanceRate}%`, icon: 'checkmark-circle-outline', color: colors.success },
    { label: 'Avg per Job', value: String(metrics.avgAppsPerJob), icon: 'stats-chart-outline', color: colors.warning },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={indigo} />}
      >
        {/* Metric cards */}
        <View style={styles.metricsRow}>
          {metricCards.map(m => (
            <View key={m.label} style={[styles.metricCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
              <Text style={[styles.metricValue, { color: colors.text }]}>{m.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Jobs by Trade Category */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Jobs by Trade Category</Text>
        {tradeBreakdown.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            <Ionicons name="bar-chart-outline" size={28} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No jobs posted yet</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            {tradeBreakdown.map((item, i) => (
              <View key={item.trade}>
                <View style={styles.tradeRow}>
                  <View style={[styles.tradeIcon, { backgroundColor: indigoBg }]}>
                    <Ionicons name="construct-outline" size={16} color={indigo} />
                  </View>
                  <Text style={[styles.tradeName, { color: colors.text }]}>{item.trade}</Text>
                  <View style={[styles.countBadge, { backgroundColor: indigoBg }]}>
                    <Text style={[styles.countText, { color: indigo }]}>{item.count}</Text>
                  </View>
                </View>
                {i < tradeBreakdown.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Applications</Text>
        {recentApps.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No applications yet</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            {recentApps.map((app, i) => (
              <View key={app.id}>
                <View style={styles.activityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{app.job_title}</Text>
                    <Text style={[styles.activityDate, { color: colors.textSecondary }]}>{formatDate(app.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(app.status) + '18' }]}>
                    <Text style={[styles.statusText, { color: statusColor(app.status) }]}>{statusLabel(app.status)}</Text>
                  </View>
                </View>
                {i < recentApps.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  scroll: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    width: '47.5%' as any,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    ...Shadows.sm,
  },
  metricValue: { ...Type.h1 },
  metricLabel: { ...Type.caption },
  sectionTitle: { ...Type.h3, marginTop: Spacing.sm },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  emptyText: { ...Type.body },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tradeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeName: { ...Type.bodySemiBold, flex: 1 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: { ...Type.captionSemiBold },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  activityTitle: { ...Type.bodySemiBold },
  activityDate: { ...Type.caption, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1 },
});
