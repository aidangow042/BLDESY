import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
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
    trade_type: string;
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

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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
      .select('id, message, status, created_at, jobs(id, title, trade_type, urgency, suburb, postcode, status)')
      .eq('builder_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data as unknown as Application[]);
    }
    setLoading(false);
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
            <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>{item.jobs.trade_type}</ThemedText>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={[styles.backText, { color: colors.tint }]}>Back</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">My Applications</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: Spacing['5xl'] }} />
      ) : applications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            You haven't applied to any jobs yet.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/builder-jobs')}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <ThemedText style={[styles.linkText, { color: colors.tint }]}>Browse Jobs</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderApplication}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    flex: 1,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  locationText: {
    fontSize: 13,
  },
  messageText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['5xl'],
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
