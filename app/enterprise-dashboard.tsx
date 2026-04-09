/**
 * Enterprise Dashboard — main hub for enterprise users.
 * Matches the website's enterprise portal with metrics, job insights, and navigation.
 */
import { useCallback, useRef, useState } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { SideDrawer } from '@/components/side-drawer';
import { PageHeader, HeaderIcon } from '@/components/page-header';

type EnterpriseProfile = {
  id: string;
  user_id: string;
  company_name: string;
  company_size: string | null;
  status: string;
  approved: boolean;
  has_active_subscription: boolean;
  subscription_plan: string | null;
  trades_needed: string[] | null;
  suburb: string | null;
  logo_url: string | null;
};

type DashboardMetrics = {
  activeJobs: number;
  totalApplicants: number;
  hired: number;
  totalPosted: number;
};

export default function EnterpriseDashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';

  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ activeJobs: 0, totalApplicants: 0, hired: 0, totalPosted: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: ep } = await supabase
      .from('enterprise_profiles')
      .select('id, user_id, company_name, company_size, status, approved, has_active_subscription, subscription_plan, trades_needed, suburb, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!ep) { setLoading(false); router.replace('/enterprise-signup' as any); return; }
    setProfile(ep as any);

    // Fetch metrics
    const [jobsRes, appsRes] = await Promise.all([
      supabase.from('jobs').select('id, status').eq('customer_id', user.id),
      supabase.from('applications').select('id, status, job_id').in('job_id',
        (await supabase.from('jobs').select('id').eq('customer_id', user.id)).data?.map((j: any) => j.id) || []
      ),
    ]);

    const jobs = jobsRes.data || [];
    const apps = appsRes.data || [];

    setMetrics({
      activeJobs: jobs.filter((j: any) => j.status === 'open' || j.status === 'in_progress').length,
      totalApplicants: apps.length,
      hired: apps.filter((a: any) => a.status === 'accepted').length,
      totalPosted: jobs.length,
    });

    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={indigo} style={{ marginTop: 100 }} />
      </View>
    );
  }

  const navItems: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string; onPress: () => void }[] = [
    { icon: 'add-circle-outline', title: 'Post a Job', description: 'Create a new job listing', onPress: () => router.push('/post-job' as any) },
    { icon: 'briefcase-outline', title: 'My Job Posts', description: 'Manage your posted jobs', onPress: () => router.push('/enterprise-jobs' as any) },
    { icon: 'document-text-outline', title: 'Applications', description: 'Review builder applications', onPress: () => router.push('/enterprise-jobs' as any) },
    { icon: 'bar-chart-outline', title: 'Analytics', description: 'Performance insights & metrics', onPress: () => router.push('/enterprise-analytics' as any) },
    { icon: 'create-outline', title: 'Edit Profile', description: 'Update company details', onPress: () => router.push('/enterprise-edit-profile' as any) },
    { icon: 'chatbubble-outline', title: 'Messages', description: 'Conversations with builders', onPress: () => router.push('/messages' as any) },
    { icon: 'card-outline', title: 'Billing & Plans', description: 'Subscription & payments', onPress: () => router.push('/enterprise-billing' as any) },
    { icon: 'settings-outline', title: 'Settings', description: 'Account preferences', onPress: () => router.push('/enterprise-settings' as any) },
  ];

  const metricCards = [
    { label: 'Active Jobs', value: metrics.activeJobs, icon: 'briefcase-outline' as const, color: indigo },
    { label: 'Applicants', value: metrics.totalApplicants, icon: 'people-outline' as const, color: colors.teal },
    { label: 'Hired', value: metrics.hired, icon: 'checkmark-circle-outline' as const, color: colors.success },
    { label: 'Total Posted', value: metrics.totalPosted, icon: 'document-text-outline' as const, color: colors.warning },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={indigo} />}
      >
        {/* Header */}
        <LinearGradient colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4f46e5', '#4338ca']} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setDrawerOpen(true)} hitSlop={12}>
              <MaterialIcons name="menu" size={24} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Enterprise Hub</Text>
              <Text style={styles.headerSubtitle}>{profile?.company_name || 'Dashboard'}</Text>
            </View>
            <Pressable onPress={() => router.push('/post-job' as any)} style={styles.postJobBtn}>
              <MaterialIcons name="add" size={18} color={indigo} />
              <Text style={[styles.postJobText, { color: indigo }]}>Post Job</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          {metricCards.map(m => (
            <View key={m.label} style={[styles.metricCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
              <Ionicons name={m.icon} size={20} color={m.color} />
              <Text style={[styles.metricValue, { color: colors.text }]}>{m.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Subscription status */}
        <View style={[styles.subCard, { backgroundColor: indigoBg, borderColor: isDark ? '#312e81' : '#c7d2fe' }]}>
          <Ionicons name={profile?.has_active_subscription ? 'shield-checkmark' : 'information-circle'} size={20} color={indigo} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.subTitle, { color: colors.text }]}>
              {profile?.has_active_subscription ? `${profile.subscription_plan || 'Active'} Plan` : 'No Active Subscription'}
            </Text>
            <Text style={[styles.subDesc, { color: colors.textSecondary }]}>
              {profile?.has_active_subscription ? 'Your subscription is active' : 'Pay per post or subscribe for bulk pricing'}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/enterprise-billing' as any)}>
            <Text style={[styles.subLink, { color: indigo }]}>Manage</Text>
          </Pressable>
        </View>

        {/* Navigation grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.navGrid}>
          {navItems.map(item => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.navCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              onPress={item.onPress}
            >
              <View style={[styles.navIcon, { backgroundColor: indigoBg }]}>
                <Ionicons name={item.icon} size={22} color={indigo} />
              </View>
              <Text style={[styles.navTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.navDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} enterpriseMode />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { color: '#fff', ...Type.h2 },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', ...Type.caption },
  postJobBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  postJobText: { ...Type.captionSemiBold },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginTop: -Spacing.lg },
  metricCard: { width: '47.5%' as any, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4, ...Shadows.sm },
  metricValue: { ...Type.h1 },
  metricLabel: { ...Type.caption },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  subTitle: { ...Type.bodySemiBold },
  subDesc: { ...Type.caption },
  subLink: { ...Type.captionSemiBold },
  sectionTitle: { ...Type.h3, paddingHorizontal: Spacing.xl, marginTop: Spacing['2xl'], marginBottom: Spacing.sm },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  navCard: { width: '47.5%' as any, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm },
  navIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  navTitle: { ...Type.bodySemiBold, fontSize: 14 },
  navDesc: { ...Type.caption, marginTop: 2, fontSize: 11 },
});
