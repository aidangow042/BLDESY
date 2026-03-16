import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type BuilderStatus = 'loading' | 'none' | 'pending' | 'approved';

export default function PortalScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [status, setStatus] = useState<BuilderStatus>('loading');

  useEffect(() => {
    checkBuilderStatus();
  }, []);

  async function checkBuilderStatus() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setStatus('none');
      return;
    }

    const { data, error } = await supabase
      .from('builder_profiles')
      .select('approved')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error || !data) {
      setStatus('none');
    } else if (data.approved) {
      setStatus('approved');
    } else {
      setStatus('pending');
    }
  }

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // Not a builder yet — show sign-up CTA
  if (status === 'none') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.ctaContainer}>
          <ThemedText type="title" style={styles.ctaTitle}>Builder Portal</ThemedText>

          <ThemedText style={[styles.ctaBody, { color: colors.textSecondary }]}>
            Join as a verified builder or tradesperson to get matched with high-intent customers in your area.
          </ThemedText>

          <View style={[styles.bulletList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {['Get found by local customers', 'Browse and apply to jobs', 'Manage your profile & reviews'].map(
              (item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: colors.tint }]} />
                  <ThemedText style={[styles.bulletItem, { color: colors.textSecondary }]}>
                    {item}
                  </ThemedText>
                </View>
              ),
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push('/(tabs)/builder-signup')}
          >
            <ThemedText style={styles.primaryButtonText}>Join as a Builder</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Applied but not approved yet
  if (status === 'pending') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
              { borderColor: colors.tint, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={checkBuilderStatus}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: colors.tint }]}>
              Check Again
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Approved — show dashboard
  const dashboardItems = [
    {
      title: 'Browse Jobs',
      description: 'Find open jobs matching your trade and apply',
      onPress: () => router.push('/(tabs)/builder/jobs'),
    },
    {
      title: 'My Applications',
      description: 'Track the status of your job applications',
      onPress: () => router.push('/(tabs)/builder/applications'),
    },
    {
      title: 'Edit Profile',
      description: 'Update your bio, availability, specialties, and contact info',
      onPress: () => router.push('/(tabs)/builder/edit-profile'),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.dashboardContainer}>
        <ThemedText type="title" style={styles.dashboardTitle}>Builder Dashboard</ThemedText>
        <ThemedText style={[styles.dashboardSubtitle, { color: colors.textSecondary }]}>
          Welcome back! Manage your builder activity below.
        </ThemedText>

        <View style={styles.dashboardCards}>
          {dashboardItems.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.dashboardCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
                Shadows.sm,
              ]}
              onPress={item.onPress}
            >
              <ThemedText type="defaultSemiBold" style={styles.dashboardCardTitle}>
                {item.title}
              </ThemedText>
              <ThemedText style={[styles.dashboardCardDesc, { color: colors.textSecondary }]}>
                {item.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
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
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
  dashboardContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['5xl'],
  },
  dashboardTitle: {
    letterSpacing: -0.5,
  },
  dashboardSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  dashboardCards: {
    gap: Spacing.md,
  },
  dashboardCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  dashboardCardTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  dashboardCardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
});
