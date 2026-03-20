import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Applicant = {
  id: string;
  builder_id: string;
  message: string | null;
  status: string;
  created_at: string;
  builder_profiles: {
    business_name: string;
    trade_category: string;
    suburb: string;
    phone: string | null;
  } | null;
};

type Job = {
  id: string;
  title: string;
  trade_type: string;
  urgency: string;
  status: string;
  suburb: string;
  postcode: string;
  created_at: string;
};

function getStatusStyle(status: string, colors: typeof Colors.light) {
  switch (status) {
    case 'open':
      return { bg: colors.successLight, text: colors.success };
    case 'assigned':
      return { bg: colors.warningLight, text: colors.warning };
    case 'closed':
      return { bg: colors.surface, text: colors.textSecondary };
    case 'accepted':
      return { bg: colors.successLight, text: colors.success };
    case 'rejected':
      return { bg: colors.errorLight, text: colors.error };
    case 'pending':
      return { bg: colors.warningLight, text: colors.warning };
    default:
      return { bg: colors.surface, text: colors.textSecondary };
  }
}

export default function MyJobsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, trade_type, urgency, status, suburb, postcode, created_at')
      .eq('customer_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }

  async function fetchApplicants(jobId: string) {
    setLoadingApplicants(true);
    const { data, error } = await supabase
      .from('applications')
      .select('id, builder_id, message, status, created_at, builder_profiles!applications_builder_id_fkey(business_name, trade_category, suburb, phone)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setApplicants(data as unknown as Applicant[]);
    }
    setLoadingApplicants(false);
  }

  function toggleExpand(jobId: string) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      setApplicants([]);
    } else {
      setExpandedJobId(jobId);
      fetchApplicants(jobId);
    }
  }

  async function handleAccept(application: Applicant, jobId: string) {
    Alert.alert(
      'Accept Builder',
      `Accept ${application.builder_profiles?.business_name ?? 'this builder'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setUpdatingId(application.id);

            // Accept this applicant
            await supabase
              .from('applications')
              .update({ status: 'accepted' })
              .eq('id', application.id);

            // Reject all others for this job
            await supabase
              .from('applications')
              .update({ status: 'rejected' })
              .eq('job_id', jobId)
              .neq('id', application.id);

            // Set job to assigned
            await supabase
              .from('jobs')
              .update({ status: 'assigned' })
              .eq('id', jobId);

            setUpdatingId(null);
            fetchApplicants(jobId);
            fetchJobs();
          },
        },
      ],
    );
  }

  async function handleReject(applicationId: string, jobId: string) {
    setUpdatingId(applicationId);
    await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId);
    setUpdatingId(null);
    fetchApplicants(jobId);
  }

  const renderJob = useCallback(
    ({ item }: { item: Job }) => {
      const isExpanded = expandedJobId === item.id;
      const statusStyle = getStatusStyle(item.status, colors);

      return (
        <View
          style={[
            styles.jobCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            Shadows.sm,
          ]}
        >
          <Pressable
            onPress={() => toggleExpand(item.id)}
            style={({ pressed }) => [styles.jobPressable, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? `Hide applicants for ${item.title}` : `View applicants for ${item.title}`}
            accessibilityState={{ expanded: isExpanded }}
          >
            <View style={styles.jobHeader}>
              <ThemedText type="defaultSemiBold" style={styles.jobTitle} numberOfLines={1}>
                {item.title}
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusStyle.text }]}>
                  {item.status}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.trade_type} — {item.suburb}, {item.postcode}
            </ThemedText>
            <View style={styles.expandRow}>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.tint}
              />
              <ThemedText style={[styles.tapHint, { color: colors.tint }]}>
                {isExpanded ? 'Hide applicants' : 'See applicants'}
              </ThemedText>
            </View>
          </Pressable>

          {isExpanded && (
            <View style={[styles.applicantsSection, { borderTopColor: colors.border }]}>
              {loadingApplicants ? (
                <ActivityIndicator color={colors.tint} style={{ marginVertical: Spacing.lg }} />
              ) : applicants.length === 0 ? (
                <ThemedText style={[styles.noApplicants, { color: colors.textSecondary }]}>
                  No applications yet
                </ThemedText>
              ) : (
                applicants.map((app) => {
                  const appStatusStyle = getStatusStyle(app.status, colors);
                  return (
                    <View
                      key={app.id}
                      style={[
                        styles.applicantCard,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
                        {app.builder_profiles?.business_name ?? 'Unknown Builder'}
                      </ThemedText>
                      <ThemedText style={[styles.applicantMeta, { color: colors.textSecondary }]}>
                        {app.builder_profiles?.trade_category} — {app.builder_profiles?.suburb}
                      </ThemedText>
                      {app.message ? (
                        <ThemedText style={[styles.applicantMessage, { color: colors.text }]}>
                          "{app.message}"
                        </ThemedText>
                      ) : null}

                      {app.status === 'pending' && item.status === 'open' ? (
                        <View style={styles.actionRow}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.acceptButton,
                              { backgroundColor: colors.success },
                              (updatingId === app.id || pressed) && { opacity: 0.7 },
                            ]}
                            onPress={() => handleAccept(app, item.id)}
                            disabled={updatingId === app.id}
                          >
                            <ThemedText style={styles.actionButtonText}>Accept</ThemedText>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [
                              styles.rejectButton,
                              { borderColor: colors.error },
                              (updatingId === app.id || pressed) && { opacity: 0.7 },
                            ]}
                            onPress={() => handleReject(app.id, item.id)}
                            disabled={updatingId === app.id}
                          >
                            <ThemedText style={[styles.rejectButtonText, { color: colors.error }]}>
                              Reject
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={[styles.applicantStatusBadge, { backgroundColor: appStatusStyle.bg }]}>
                          <ThemedText style={{ color: appStatusStyle.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                            {app.status}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      );
    },
    [expandedJobId, applicants, loadingApplicants, updatingId, colors],
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <PageHeader
        title="My Jobs"
        subtitle="Manage your posted jobs"
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
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            You haven't posted any jobs yet.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/post-job')}
            style={({ pressed }) => [
              styles.emptyButton,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={styles.emptyButtonText}>Post a Job</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
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
  jobCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  jobHeader: {
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
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  jobPressable: {
    // wrapper so the whole header area is tappable
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tapHint: {
    fontSize: 14,
    fontWeight: '600',
  },
  applicantsSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  noApplicants: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  applicantCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  applicantMeta: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  applicantMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  acceptButton: {
    flex: 1,
    borderRadius: Radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    borderRadius: Radius.lg,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  applicantStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['5xl'],
    gap: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyButton: {
    borderRadius: Radius.lg,
    height: 52,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
