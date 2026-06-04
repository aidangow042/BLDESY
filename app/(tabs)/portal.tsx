import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { HamburgerMenu } from '@/components/layout';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { DashboardColors, DashboardShadows } from '@/constants/dashboard-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { AppShell } from '@/components/layout';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { QuickStatsGrid, type QuickStat } from '@/components/dashboard/quick-stats-grid';
import { HealthGauge } from '@/components/dashboard/health-gauge';
import { AICoachCard } from '@/components/dashboard/ai-coach-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ApplicationBreakdown } from '@/components/dashboard/application-breakdown';
import { NotificationsPanel } from '@/components/dashboard/notifications-panel';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useUnreadCount } from '@/hooks/use-unread-count';
import { computeCoachTip, useDashboardMetrics, useWorkNearby } from '@/lib/dashboard-data';
import { friendlyError } from '@/lib/error-messages';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';

type BuilderStatus = 'loading' | 'none' | 'pending' | 'approved' | 'error';

type ProfileData = {
  business_name: string | null;
  trade_category: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  suburb: string | null;
  postcode: string | null;
  abn: string | null;
  license_key: string | null;
  specialties: string[] | null;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  projects: any[] | null;
  credentials: any[] | null;
  availability: string | null;
  established_year: number | null;
  team_size: string | null;
};

function getProfileCompleteness(p: ProfileData | null): { percent: number; missing: string[] } {
  if (!p) return { percent: 0, missing: [] };
  const checks: { label: string; done: boolean }[] = [
    { label: 'Business name', done: !!p.business_name },
    { label: 'Bio / About', done: !!p.bio },
    { label: 'Phone', done: !!p.phone },
    { label: 'Cover photo', done: !!p.cover_photo_url },
    { label: 'Profile photo', done: !!p.profile_photo_url },
    { label: 'Specialties', done: Array.isArray(p.specialties) && p.specialties.length > 0 },
    { label: 'At least one project', done: Array.isArray(p.projects) && p.projects.length > 0 },
    { label: 'ABN', done: !!p.abn },
    { label: 'Licence number', done: !!p.license_key },
    { label: 'Website', done: !!p.website },
  ];
  const done = checks.filter(c => c.done).length;
  const missing = checks.filter(c => !c.done).map(c => c.label);
  return { percent: Math.round((done / checks.length) * 100), missing };
}

export default function PortalScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const teal = colors.teal;
  const tealBg = colors.tealBg;
  const bgCanvas = colors.canvas;
  const router = useRouter();

  const { userId: ctxUserId } = useUser();
  const [status, setStatus] = useState<BuilderStatus>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync auth context userId
  useEffect(() => { if (ctxUserId) setUserId(ctxUserId); }, [ctxUserId]);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const notificationsRef = useRef<BottomSheet>(null);
  const { count: unreadMessages } = useUnreadCount(userId);
  const { metrics } = useDashboardMetrics(userId);
  const { count: workNearby } = useWorkNearby(userId);
  const coachTip = useMemo(() => computeCoachTip(profile), [profile]);

  useFocusEffect(
    useCallback(() => {
      checkBuilderStatus();
    }, [])
  );

  async function checkBuilderStatus() {
    setErrorMessage(null);
    if (!ctxUserId) {
      setStatus('none');
      return;
    }

    const { data, error } = await supabase
      .from('builder_profiles')
      .select('id, user_id, business_name, trade_category, suburb, postcode, bio, phone, email, website, profile_photo_url, cover_photo_url, projects, specialties, credentials, availability, availability_note, response_time, urgency_capacity, abn, license_key, approved, latitude, longitude, radius_km')
      .eq('user_id', ctxUserId)
      .maybeSingle();

    if (error) {
      setErrorMessage(friendlyError(error));
      setStatus('error');
    } else if (!data) {
      setStatus('none');
    } else if (data.approved) {
      setStatus('approved');
      setProfile(data);
    } else {
      setStatus('pending');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await checkBuilderStatus();
    setRefreshing(false);
  }

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <ActivityIndicator color={teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // Fetch error — show user-facing error state
  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <View style={styles.ctaContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <ThemedText type="title" style={styles.ctaTitle}>Something went wrong</ThemedText>
          <ThemedText style={[styles.ctaBody, { color: colors.textSecondary }]}>
            {errorMessage ?? 'Failed to load your builder profile. Please try again.'}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: teal, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={checkBuilderStatus}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Not a builder yet — show sign-up CTA
  if (status === 'none') {
    const features: { icon: React.ComponentProps<typeof MaterialIcons>['name']; text: string }[] = [
      { icon: 'search',     text: 'Get found by local customers' },
      { icon: 'assignment', text: 'Browse and apply to jobs' },
      { icon: 'star',       text: 'Showcase projects & earn reviews' },
      { icon: 'insights',   text: 'Manage your professional profile' },
    ];

    return (
      <AppShell title="Builder Portal">
        <ScrollView
          contentContainerStyle={styles.noneScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.noneContent}>
            <ThemedText style={[styles.ctaBody, { color: colors.textSecondary }]}>
              Join as a verified builder or tradesperson to get matched with high-intent customers in your area.
            </ThemedText>

            {/* Social proof stat banner */}
            <View style={[styles.statBanner, { backgroundColor: tealBg }]}>
              <MaterialIcons name="trending-up" size={20} color="#0d9488" />
              <Text style={[styles.statText, { color: colors.text }]}>
                New jobs posted daily in your area
              </Text>
            </View>

            {/* Feature list */}
            <View style={[styles.bulletList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {features.map((item) => (
                <View key={item.text} style={styles.bulletRow}>
                  <View style={[styles.featureIconCircle, { backgroundColor: tealBg }]}>
                    <MaterialIcons name={item.icon} size={18} color="#0d9488" />
                  </View>
                  <Text style={[styles.bulletItem, { color: colors.text }]}>
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Gradient CTA */}
            <Pressable
              onPress={() => router.push('/builder-signup')}
              style={({ pressed }) => [styles.ctaWrapper, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Get started as a builder"
            >
              <LinearGradient
                colors={['#0d9488', '#0f766e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                <Text style={styles.ctaBtnText}>Get Started</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </AppShell>
    );
  }

  // Applied but not approved yet
  if (status === 'pending') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <View style={styles.ctaContainer}>
          <View style={[styles.pendingIconWrap, { backgroundColor: colors.warningLight }]}>
            <ThemedText style={styles.pendingIcon}>&#x23F3;</ThemedText>
          </View>
          <ThemedText type="title" style={styles.ctaTitle}>Pending Approval</ThemedText>
          <ThemedText style={[styles.ctaBody, { color: colors.textSecondary }]}>
            Your builder application is under review. We'll notify you once you're approved.
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: teal, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={checkBuilderStatus}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: teal }]}>
              Check Again
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Approved — Dashboard ────────────────────────────────────────────

  const { percent, missing } = getProfileCompleteness(profile);

  const dashboardCards: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string; onPress: () => void }[] = [
    {
      icon: 'create-outline',
      title: 'Edit Profile',
      description: 'Photos, projects, specialties, credentials & contact info',
      onPress: () => router.push('/builder-edit-profile'),
    },
    {
      icon: 'briefcase-outline',
      title: 'Project Jobs',
      description: 'Browse large-scale project work',
      onPress: () => router.push({ pathname: '/builder-jobs', params: { type: 'commercial' } } as any),
    },
    {
      icon: 'home-outline',
      title: 'Home Jobs',
      description: 'Browse home renovation and repair jobs',
      onPress: () => router.push({ pathname: '/builder-jobs', params: { type: 'residential' } } as any),
    },
    {
      icon: 'reader-outline',
      title: 'Contracts',
      description: 'Ongoing work — multi-week and recurring contracts',
      onPress: () => router.push({ pathname: '/builder-jobs', params: { type: 'contracts' } } as any),
    },
    {
      icon: 'document-text-outline',
      title: 'Applications',
      description: 'Track your job applications and their status',
      onPress: () => router.push('/builder-applications'),
    },
    {
      icon: 'bar-chart-outline',
      title: 'Analytics',
      description: 'Track views, applications & profile performance',
      onPress: () => router.push('/builder-analytics'),
    },
    {
      icon: 'card-outline',
      title: CAN_SELL_IN_APP ? 'Billing & Pricing' : 'Billing',
      description: CAN_SELL_IN_APP
        ? 'Your plan, payment method, and tier upgrades'
        : 'Your current plan and subscription status',
      onPress: () => router.push('/billing'),
    },
    {
      icon: 'settings-outline',
      title: 'Settings',
      description: 'Account preferences and notifications',
      onPress: () => router.push('/settings'),
    },
  ];

  // Headline metrics — animated 2×2 grid over the teal header.
  const stats: QuickStat[] = [
    {
      key: 'views',
      label: 'Profile Views',
      value: metrics.profileViews.value,
      icon: 'eye-outline',
      accent: '#0d9488',
      tint: 'rgba(13,148,136,0.10)',
      onPress: () => router.push('/builder-analytics'),
    },
    {
      key: 'apps',
      label: 'Applications',
      value: metrics.applications.value,
      icon: 'mail-outline',
      accent: '#4f46e5',
      tint: 'rgba(79,70,229,0.10)',
      onPress: () => router.push('/builder-applications'),
    },
    {
      key: 'saves',
      label: 'Profile Saves',
      value: metrics.saves.value,
      icon: 'bookmark-outline',
      accent: '#059669',
      tint: 'rgba(5,150,105,0.10)',
      onPress: () => router.push('/builder-analytics'),
    },
    {
      key: 'nearby',
      label: 'Work Nearby',
      value: workNearby,
      icon: 'location-outline',
      accent: '#d97706',
      tint: 'rgba(217,119,6,0.10)',
      onPress: () => router.push({ pathname: '/builder-jobs', params: { type: 'commercial' } } as any),
    },
  ];

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      {/* Subtle grain texture */}
      <View style={styles.grainOverlay} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, row) => (
          <View key={row} style={styles.grainRow}>
            {Array.from({ length: 14 }).map((_, col) => (
              <View key={col} style={styles.grainDot} />
            ))}
          </View>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={styles.dashboardScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={teal} />
        }
      >
        {/* Header */}
        <DashboardHeader
          businessName={profile?.business_name || 'Builder'}
          profilePhotoUrl={profile?.profile_photo_url ?? null}
          notificationCount={unreadMessages}
          isAvailable={profile?.availability === 'available'}
          onBellPress={() => notificationsRef.current?.expand()}
          onHamburgerPress={() => setDrawerOpen(true)}
        />

        {/* Key metrics hero — animated stats over the teal header */}
        <QuickStatsGrid stats={stats} />

        {/* Application funnel — acceptance rate + status breakdown */}
        <ApplicationBreakdown userId={userId} />

        {/* Profile health gauge */}
        <HealthGauge
          score={percent}
          tips={missing.slice(0, 3).map(item => ({
            text: item,
            points: 10,
            onPress: () => router.push('/builder-edit-profile'),
          }))}
        />

        {/* AI Coach */}
        <AICoachCard tip={coachTip} onGetCoaching={() => router.navigate('/(tabs)/ai' as any)} />

        {/* Navigation grid */}
        <View style={styles.navGrid}>
          {dashboardCards.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.navCard,
                { opacity: pressed ? 0.8 : 1 },
                DashboardShadows.subtle,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.navCardIconCircle}>
                <Ionicons name={item.icon} size={22} color={DashboardColors.accent} />
              </View>
              <Text style={styles.navCardTitle}>{item.title}</Text>
              <Text style={styles.navCardDesc} numberOfLines={2}>{item.description}</Text>
            </Pressable>
          ))}
        </View>

        {/* Activity feed */}
        <ActivityFeed userId={userId} onViewAll={() => {}} />

      </ScrollView>

      {/* Notifications bottom sheet */}
      <NotificationsPanel ref={notificationsRef} userId={userId} />

      {/* Side drawer (Settings, Help, Legal, etc.) */}
      <HamburgerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  ctaContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  ctaBody: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  bulletList: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    width: '100%',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  pendingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  pendingIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
  primaryButton: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Shadows.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // None state (not a builder yet)
  noneScroll: {
    flexGrow: 1,
    paddingBottom: Spacing['5xl'],
  },
  noneContent: {
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  statBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    borderRadius: Radius.lg,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Dashboard
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    zIndex: 0,
    opacity: 0.4,
  },
  grainRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  grainDot: {
    width: 1.5,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dashboardScroll: {
    paddingBottom: 100,
  },
  // Navigation grid
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  navCard: {
    backgroundColor: DashboardColors.surface,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '47.5%' as any,
  },
  navCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DashboardColors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  navCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: DashboardColors.textPrimary,
  },
  navCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    color: DashboardColors.textSecondary,
  },

});
