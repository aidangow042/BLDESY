import { useCallback, useEffect, useState } from 'react';
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

const URGENCY_LABELS: Record<string, string> = {
  asap: 'ASAP',
  this_week: 'This Week',
  flexible: 'Flexible',
};

type Job = {
  id: string;
  title: string;
  description: string | null;
  trade_type: string;
  urgency: string;
  suburb: string;
  postcode: string;
  budget: string | null;
  created_at: string;
};

export default function BuilderJobsFeed() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderTrade, setBuilderTrade] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string | null>(null);

  const urgencySemanticColor = (urgency: string) => {
    switch (urgency) {
      case 'asap': return { color: colors.error, bg: colors.errorLight };
      case 'this_week': return { color: colors.warning, bg: colors.warningLight };
      case 'flexible': return { color: colors.success, bg: colors.successLight };
      default: return { color: colors.icon, bg: colors.surface };
    }
  };

  useEffect(() => {
    fetchBuilderTradeAndJobs();
  }, []);

  useEffect(() => {
    if (builderTrade) {
      fetchJobs();
    }
  }, [filterUrgency, builderTrade]);

  async function fetchBuilderTradeAndJobs() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data: profile } = await supabase
      .from('builder_profiles')
      .select('trade_category')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (profile?.trade_category) {
      setBuilderTrade(profile.trade_category);
    }
  }

  async function fetchJobs() {
    setLoading(true);

    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (builderTrade) {
      query = query.eq('trade_type', builderTrade.toLowerCase());
    }

    if (filterUrgency) {
      query = query.eq('urgency', filterUrgency);
    }

    const { data, error } = await query;

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  }

  const renderJob = useCallback(
    ({ item }: { item: Job }) => {
      const uc = urgencySemanticColor(item.urgency);
      return (
        <Pressable
          style={({ pressed }) => [
            styles.jobCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            Shadows.sm,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.push({ pathname: '/job-detail', params: { id: item.id } })}
        >
          <View style={styles.jobCardHeader}>
            <ThemedText type="defaultSemiBold" style={styles.jobTitle} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <View style={[styles.urgencyBadge, { backgroundColor: uc.bg }]}>
              <ThemedText style={[styles.urgencyText, { color: uc.color }]}>
                {URGENCY_LABELS[item.urgency] ?? item.urgency}
              </ThemedText>
            </View>
          </View>

          {item.description ? (
            <ThemedText style={[styles.descriptionText, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </ThemedText>
          ) : null}

          <View style={styles.jobMeta}>
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.suburb}, {item.postcode}
            </ThemedText>
            {item.budget ? (
              <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
                Budget: {item.budget}
              </ThemedText>
            ) : null}
          </View>

          <View style={[styles.tradeBadge, { backgroundColor: colors.tintLight }]}>
            <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>{item.trade_type}</ThemedText>
          </View>
        </Pressable>
      );
    },
    [colors, router],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={[styles.backText, { color: colors.tint }]}>Back</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">Open Jobs</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Urgency filter */}
      <View style={styles.filterRow}>
        <Pressable
          style={({ pressed }) => [
            styles.filterChip,
            {
              backgroundColor: !filterUrgency ? colors.tintLight : colors.surface,
              borderColor: !filterUrgency ? colors.tint : colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => setFilterUrgency(null)}
        >
          <ThemedText
            style={[styles.filterChipText, { color: !filterUrgency ? colors.tint : colors.textSecondary }]}
          >
            All
          </ThemedText>
        </Pressable>
        {Object.entries(URGENCY_LABELS).map(([value, label]) => (
          <Pressable
            key={value}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: filterUrgency === value ? colors.tintLight : colors.surface,
                borderColor: filterUrgency === value ? colors.tint : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setFilterUrgency(value)}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                { color: filterUrgency === value ? colors.tint : colors.textSecondary },
              ]}
            >
              {label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.tint} style={{ marginTop: Spacing['5xl'] }} />
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            No open jobs matching your trade right now.
          </ThemedText>
          <Pressable
            onPress={fetchJobs}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <ThemedText style={[styles.refreshText, { color: colors.tint }]}>Refresh</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
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
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobTitle: {
    fontSize: 16,
    flex: 1,
  },
  urgencyBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  jobMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
  },
  tradeBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  tradeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  refreshText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
