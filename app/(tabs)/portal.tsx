import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { SideDrawer } from '@/components/side-drawer';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { DashboardColors, DashboardShadows } from '@/constants/dashboard-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { PageHeader, HeaderIcon } from '@/components/page-header';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { HealthGauge } from '@/components/dashboard/health-gauge';
import { AICoachCard } from '@/components/dashboard/ai-coach-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { NotificationsPanel } from '@/components/dashboard/notifications-panel';
import type BottomSheet from '@gorhom/bottom-sheet';

type BuilderStatus = 'loading' | 'none' | 'pending' | 'approved';

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

  const [status, setStatus] = useState<BuilderStatus>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const notificationsRef = useRef<BottomSheet>(null);

  useFocusEffect(
    useCallback(() => {
      checkBuilderStatus();
    }, [])
  );

  async function checkBuilderStatus() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setStatus('none');
      return;
    }

    const { data, error } = await supabase
      .from('builder_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error || !data) {
      setStatus('none');
    } else if (data.approved) {
      setStatus('approved');
      setProfile(data);
    } else {
      setStatus('pending');
    }
  }

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <ActivityIndicator color={teal} style={{ marginTop: 60 }} />
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
      <View style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <ScrollView
          contentContainerStyle={styles.noneScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PageHeader
            title="Builder Portal"
            subtitle="Grow your trade business"
            variant="professional"
            rightElement={
              <HeaderIcon onRichBackground>
                <MaterialIcons name="construction" size={24} color="#fff" />
              </HeaderIcon>
            }
          />

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
      </View>
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
      icon: 'briefcase-outline',
      title: 'Browse Jobs',
      description: 'Find open jobs matching your trade and apply',
      onPress: () => router.push('/builder-jobs'),
    },
    {
      icon: 'bar-chart-outline',
      title: 'Analytics',
      description: 'Track views, applications & profile performance',
      onPress: () => router.push('/builder-analytics'),
    },
    {
      icon: 'create-outline',
      title: 'Edit Profile',
      description: 'Photos, projects, specialties, credentials & contact info',
      onPress: () => router.push('/builder-edit-profile'),
    },
  ];


  return (
    <View style={[styles.safeArea, { backgroundColor: '#D4DCCE' }]}>
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
      <ScrollView contentContainerStyle={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <DashboardHeader
          businessName={profile?.business_name || 'Builder'}
          profilePhotoUrl={profile?.profile_photo_url ?? null}
          notificationCount={3}
          isAvailable={profile?.availability === 'available'}
          onBellPress={() => notificationsRef.current?.expand()}
          onHamburgerPress={() => setDrawerOpen(true)}
        />

        {/* Key metrics hero */}
        <MetricsGrid
          onViewAnalytics={() => router.push('/builder-analytics')}
          onCardPress={() => router.push('/builder-analytics')}
        />

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
        <AICoachCard onGetCoaching={() => router.navigate('/(tabs)/ai' as any)} />

        {/* Dashboard cards */}
        <View style={styles.dashboardCards}>
          {dashboardCards.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.dashboardCard,
                { opacity: pressed ? 0.8 : 1 },
                DashboardShadows.subtle,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.cardIconRow}>
                <View style={styles.cardIconCircle}>
                  <Ionicons name={item.icon} size={20} color={DashboardColors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dashboardCardTitle}>{item.title}</Text>
                  <Text style={styles.dashboardCardDesc}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={DashboardColors.textMuted} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Activity feed */}
        <ActivityFeed onViewAll={() => {}} />

        {/* Bottom stats bar */}
        {profile && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="hammer-outline" size={16} color={DashboardColors.accent} />
              <Text style={styles.statNumber}>
                {Array.isArray(profile.projects) ? profile.projects.length : 0}
              </Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="camera-outline" size={16} color={DashboardColors.accent} />
              <Text style={styles.statNumber}>
                {(Array.isArray(profile.projects) ? profile.projects.reduce((sum: number, p: any) => sum + (Array.isArray(p?.images) ? p.images.length : 0), 0) : 0)}
              </Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star-outline" size={16} color={DashboardColors.accent} />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="heart-outline" size={16} color={DashboardColors.accent} />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Saves</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Notifications bottom sheet */}
      <NotificationsPanel ref={notificationsRef} />

      {/* Side drawer (Settings, Help, Legal, etc.) */}
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} builderMode />
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
  // Dashboard cards
  dashboardCards: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  dashboardCard: {
    backgroundColor: DashboardColors.surface,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DashboardColors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: DashboardColors.textPrimary,
  },
  dashboardCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    color: DashboardColors.textSecondary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: DashboardColors.surface,
    borderWidth: 1,
    borderColor: DashboardColors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: DashboardColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginTop: 2,
    color: DashboardColors.textSecondary,
  },
});
