/**
 * Enterprise Hub Dashboard — premium visual polish.
 * Deep indigo/violet gradient header, accent-bordered stat cards,
 * prominent subscription banner, polished quick-action grid.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
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
import { useUser } from '@/lib/auth-context';
import { SideDrawer } from '@/components/side-drawer';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Animated counter ─────────────────────────────────────────────────────────

function CountUp({ to, color }: { to: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: to, duration: 800, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(id);
  }, [to]);

  return <Text style={[styles.metricValue, { color }]}>{display}</Text>;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function EnterpriseDashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoMid = isDark ? '#6366f1' : '#6366f1';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';
  const indigoSoft = isDark ? 'rgba(99,102,241,0.08)' : 'rgba(79,70,229,0.04)';

  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>({ activeJobs: 0, totalApplicants: 0, hired: 0, totalPosted: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { userId: ctxUserId } = useUser();

  const loadDashboard = useCallback(async () => {
    if (!ctxUserId) { setLoading(false); return; }
    const user = { id: ctxUserId };

    const { data: ep } = await supabase
      .from('enterprise_profiles')
      .select('id, user_id, company_name, company_size, status, approved, has_active_subscription, subscription_plan, trades_needed, suburb, logo_url')
      .eq('user_id', user.id)
      .single();

    if (!ep) { setLoading(false); router.replace('/enterprise-signup' as any); return; }
    setProfile(ep as any);

    // Fetch jobs first, then use IDs for applications (avoids duplicate query)
    const { data: jobsData } = await supabase.from('jobs').select('id, status').eq('customer_id', user.id);
    const jobs = jobsData || [];
    const jobIds = jobs.map((j: any) => j.id);

    let apps: any[] = [];
    if (jobIds.length > 0) {
      const { data: appsData } = await supabase.from('applications').select('id, status, job_id').in('job_id', jobIds);
      apps = appsData || [];
    }

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

  const metricCards: { label: string; value: number; icon: React.ComponentProps<typeof Ionicons>['name']; accent: string; tint: string }[] = [
    { label: 'Active Jobs', value: metrics.activeJobs, icon: 'briefcase', accent: '#4f46e5', tint: 'rgba(79,70,229,0.06)' },
    { label: 'Applicants', value: metrics.totalApplicants, icon: 'people', accent: '#0d9488', tint: 'rgba(13,148,136,0.06)' },
    { label: 'Hired', value: metrics.hired, icon: 'checkmark-circle', accent: '#059669', tint: 'rgba(5,150,105,0.06)' },
    { label: 'Total Posted', value: metrics.totalPosted, icon: 'document-text', accent: '#d97706', tint: 'rgba(217,119,6,0.06)' },
  ];

  const navItems: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string; onPress: () => void }[] = [
    { icon: 'add-circle-outline', title: 'Post a Job', description: 'Create a new job listing', onPress: () => router.push('/post-job' as any) },
    { icon: 'briefcase-outline', title: 'My Job Posts', description: 'Manage your posted jobs', onPress: () => router.push('/enterprise-jobs' as any) },
    { icon: 'bar-chart-outline', title: 'Analytics', description: 'Performance insights & metrics', onPress: () => router.push('/enterprise-analytics' as any) },
    { icon: 'create-outline', title: 'Edit Profile', description: 'Update company details', onPress: () => router.push('/enterprise-edit-profile' as any) },
    { icon: 'card-outline', title: 'Billing & Plans', description: 'Subscription & payments', onPress: () => router.push('/enterprise-billing' as any) },
    { icon: 'settings-outline', title: 'Settings', description: 'Account preferences', onPress: () => router.push('/enterprise-settings' as any) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Subtle radial background tint */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: indigoSoft }]} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={indigo} />}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={isDark ? ['#1e1b4b', '#312e81', '#3730a3'] : ['#4338ca', '#4f46e5', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
        >
          {/* Grain texture overlay */}
          <View style={styles.grainOverlay} pointerEvents="none">
            {Array.from({ length: 8 }).map((_, row) => (
              <View key={row} style={styles.grainRow}>
                {Array.from({ length: 12 }).map((_, col) => (
                  <View key={col} style={styles.grainDot} />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.headerRow}>
            <Pressable onPress={() => setDrawerOpen(true)} hitSlop={12} style={styles.hamburgerBtn}>
              <MaterialIcons name="menu" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Enterprise Hub</Text>
              <Text style={styles.headerSubtitle}>{profile?.company_name || 'Dashboard'}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/post-job' as any)}
              style={({ pressed }) => [styles.postJobBtn, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.postJobGrad}
              >
                <MaterialIcons name="add" size={16} color="#4f46e5" />
                <Text style={styles.postJobText}>Post Job</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Stats Grid ── */}
        <View style={styles.metricsRow}>
          {metricCards.map(m => (
            <View
              key={m.label}
              style={[
                styles.metricCard,
                {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: isDark ? colors.border : '#e2e8f0',
                },
              ]}
            >
              {/* Accent top border */}
              <View style={[styles.metricAccent, { backgroundColor: m.accent }]} />
              <View style={[styles.metricIconWrap, { backgroundColor: m.tint }]}>
                <Ionicons name={m.icon} size={18} color={m.accent} />
              </View>
              <CountUp to={m.value} color={isDark ? colors.text : '#0f172a'} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Subscription Banner ── */}
        <View style={[styles.subCard, { borderColor: isDark ? '#312e81' : '#a5b4fc' }]}>
          <LinearGradient
            colors={isDark ? ['#1e1b4b', '#312e81'] : ['#eef2ff', '#e0e7ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subCardInner}
          >
            <View style={[styles.subIconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(79,70,229,0.1)' }]}>
              <Ionicons name={profile?.has_active_subscription ? 'shield-checkmark' : 'information-circle'} size={22} color={indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subTitle, { color: isDark ? colors.text : '#1e1b4b' }]}>
                {profile?.has_active_subscription ? `${profile.subscription_plan || 'Active'} Plan` : 'No Active Subscription'}
              </Text>
              <Text style={[styles.subDesc, { color: isDark ? colors.textSecondary : '#64748b' }]}>
                {profile?.has_active_subscription ? 'Your subscription is active' : 'Pay per post or subscribe for bulk pricing'}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/enterprise-billing' as any)}
              style={({ pressed }) => [styles.manageBtn, { backgroundColor: isDark ? indigo : '#4f46e5' }, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.manageBtnText}>Manage</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.navGrid}>
          {navItems.map(item => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.navCard,
                {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: isDark ? colors.border : '#e2e8f0',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              onPress={item.onPress}
            >
              {/* Thin accent top line */}
              <View style={[styles.navAccent, { backgroundColor: indigo }]} />
              <View style={[styles.navIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff' }]}>
                <Ionicons name={item.icon} size={22} color={indigo} />
              </View>
              <View style={styles.navTextWrap}>
                <Text style={[styles.navTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.navDesc, { color: isDark ? colors.textSecondary : '#64748b' }]} numberOfLines={2}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={isDark ? colors.icon : '#c7d2fe'} style={styles.navChevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} enterpriseMode />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 120 },

  // Header
  header: {
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    opacity: 0.3,
  },
  grainRow: { flexDirection: 'row', justifyContent: 'space-evenly' },
  grainDot: { width: 1.5, height: 1.5, borderRadius: 0.75, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hamburgerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'RussoOne_400Regular',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  postJobBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  postJobGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  postJobText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.xl,
  },
  metricCard: {
    width: '47.5%' as any,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  metricAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Subscription banner
  subCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  subCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  subIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  manageBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  manageBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Quick Actions
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  navCard: {
    width: '48.5%' as any,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  navAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.4,
  },
  navIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  navTextWrap: { flex: 1 },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  navDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  navChevron: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
  },
});
