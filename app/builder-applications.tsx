import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/page-header';
import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Application = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    trade_category: string;
    urgency: string;
    suburb: string;
    postcode: string;
    status: string;
  };
};

export default function MyApplicationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const statusSemanticColor = (status: string) => {
    switch (status) {
      case 'accepted': return { color: colors.success, bg: colors.successLight, label: 'Accepted' };
      case 'rejected': return { color: colors.error, bg: colors.errorLight, label: 'Rejected' };
      case 'pending': return { color: colors.warning, bg: colors.warningLight, label: 'Pending' };
      default: return { color: colors.icon, bg: colors.surface, label: status };
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('applications')
      .select('id, message, status, created_at, jobs(id, title, trade_category, urgency, suburb, postcode, status)')
      .eq('builder_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data as unknown as Application[]);
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  }

  function renderApplication({ item }: { item: Application }) {
    const sc = statusSemanticColor(item.status);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          Shadows.sm,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => router.push({ pathname: '/job-detail', params: { id: item.jobs.id } })}
      >
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold" style={styles.jobTitle} numberOfLines={1}>
            {item.jobs.title}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <ThemedText style={[styles.statusText, { color: sc.color }]}>
              {sc.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.tradeBadge, { backgroundColor: colors.tintLight }]}>
            <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>{item.jobs.trade_category}</ThemedText>
          </View>
          <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
            {item.jobs.suburb}, {item.jobs.postcode}
          </ThemedText>
        </View>

        {item.message ? (
          <ThemedText style={[styles.messageText, { color: colors.textSecondary }]} numberOfLines={2}>
            "{item.message}"
          </ThemedText>
        ) : null}

        <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
          Applied {new Date(item.created_at).toLocaleDateString('en-AU')}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <PageHeader
        title="My Applications"
        subtitle="Track your job applications"
        variant="professional"
      />
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color="#ffffff" />
      </Pressable>

      {loading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: Spacing['5xl'] }} />
      ) : applications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.tealBg }]}>
            <Ionicons name="briefcase-outline" size={48} color={colors.teal} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            No applications yet
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Browse available jobs that match your trade and start applying.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/builder-jobs')}
            style={({ pressed }) => [
              styles.emptyOutlineCta,
              { borderColor: colors.teal },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Browse Jobs"
          >
            <ThemedText style={[styles.emptyOutlineCtaText, { color: colors.teal }]}>Browse Jobs</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderApplication}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobTitle: {
    ...Type.h3,
    flex: 1,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    ...Type.label,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tradeBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tradeBadgeText: {
    ...Type.label,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationText: {
    ...Type.caption,
  },
  messageText: {
    ...Type.body,
    fontStyle: 'italic',
  },
  dateText: {
    ...Type.caption,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Type.h2,
    textAlign: 'center',
  },
  emptySubtext: {
    ...Type.body,
    textAlign: 'center',
  },
  emptyOutlineCta: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 32,
    marginTop: Spacing.md,
  },
  emptyOutlineCtaText: {
    ...Type.btnPrimary,
  },
});
