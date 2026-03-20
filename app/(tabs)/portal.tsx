import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { PageHeader, HeaderAvatar, HeaderIcon } from '@/components/page-header';

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

  const dashboardCards = [
    {
      icon: '📋',
      title: 'Browse Jobs',
      description: 'Find open jobs matching your trade and apply',
      onPress: () => router.push('/builder-jobs'),
      accent: false,
    },
    {
      icon: '📬',
      title: 'My Applications',
      description: 'Track the status of your job applications',
      onPress: () => router.push('/builder-applications'),
      accent: false,
    },
    {
      icon: '✏️',
      title: 'Edit Profile',
      description: 'Photos, projects, specialties, credentials & contact info',
      onPress: () => router.push('/builder-edit-profile'),
      accent: true,
    },
  ];

  return (
    <View style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
      <ScrollView contentContainerStyle={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back${profile?.business_name ? `, ${profile.business_name}` : ''}!`}
          variant="professional"
          watermark="🏗️"
          rightElement={
            <HeaderAvatar
              uri={profile?.profile_photo_url}
              fallback={<Text style={{ fontSize: 22 }}>👤</Text>}
            />
          }
        />

        {/* Profile completeness card */}
        <View style={[styles.completenessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.completenessHeader}>
            <Text style={[styles.completenessTitle, { color: colors.text }]}>Profile Completeness</Text>
            <Text style={[styles.completenessPercent, { color: percent === 100 ? teal : colors.warning }]}>
              {percent}%
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: percent === 100 ? teal : colors.warning,
                  width: `${percent}%`,
                },
              ]}
            />
          </View>

          {percent < 100 && missing.length > 0 && (
            <View style={styles.missingList}>
              <Text style={[styles.missingLabel, { color: colors.textSecondary }]}>
                Still needed:
              </Text>
              {missing.slice(0, 3).map(item => (
                <View key={item} style={styles.missingRow}>
                  <Text style={{ color: colors.warning, fontSize: 12 }}>○</Text>
                  <Text style={[styles.missingItem, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
              {missing.length > 3 && (
                <Text style={[styles.missingMore, { color: colors.textSecondary }]}>
                  +{missing.length - 3} more
                </Text>
              )}
            </View>
          )}

          {percent < 100 && (
            <Pressable
              onPress={() => router.push('/builder-edit-profile')}
              style={({ pressed }) => [
                styles.completeProfileBtn,
                { backgroundColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.completeProfileBtnText}>Complete Your Profile</Text>
            </Pressable>
          )}

          {percent === 100 && (
            <View style={[styles.completeBadge, { backgroundColor: tealBg }]}>
              <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>
                ✓ Profile complete — you look great!
              </Text>
            </View>
          )}
        </View>

        {/* Dashboard cards */}
        <View style={styles.dashboardCards}>
          {dashboardCards.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.dashboardCard,
                {
                  backgroundColor: item.accent ? tealBg : colors.surface,
                  borderColor: item.accent ? teal : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
                Shadows.sm,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.cardIconRow}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={[styles.dashboardCardTitle, { color: colors.text }]}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={[styles.dashboardCardDesc, { color: colors.textSecondary }]}>
                    {item.description}
                  </ThemedText>
                </View>
                <Text style={{ color: colors.icon, fontSize: 18 }}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Quick stats (if profile has data) */}
        {profile && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: teal }]}>
                {Array.isArray(profile.projects) ? profile.projects.length : 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Projects</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: teal }]}>
                {Array.isArray(profile.specialties) ? profile.specialties.length : 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Specialties</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: teal }]}>
                {Array.isArray(profile.credentials) ? profile.credentials.length : 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Docs</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  dashboardScroll: {
    paddingBottom: Spacing['5xl'],
  },
  // Completeness card
  completenessCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  completenessTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  completenessPercent: {
    fontSize: 22,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  missingList: {
    marginTop: Spacing.md,
    gap: 4,
  },
  missingLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missingItem: {
    fontSize: 13,
    fontWeight: '500',
  },
  missingMore: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  completeProfileBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  completeProfileBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  completeBadge: {
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },

  // Dashboard cards
  dashboardCards: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  dashboardCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dashboardCardTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  dashboardCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
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
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
