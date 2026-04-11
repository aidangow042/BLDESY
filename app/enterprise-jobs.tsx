/**
 * Enterprise Jobs — job management screen for enterprise users.
 * Shows posted jobs with applicant counts, status badges, and urgency pills.
 * Uses indigo accent to match the enterprise portal design language.
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { getRelativeTime, URGENCY_CONFIG } from '@/lib/trade-utils';

/* ─── Types ────────────────────────────────────────────────── */

type Applicant = {
  id: string;
  builder_id: string;
  status: string;
  message: string | null;
  created_at: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  profile_photo_url: string | null;
};

type Job = {
  id: string;
  title: string;
  trade_category: string;
  suburb: string;
  urgency: string;
  status: string;
  workers_needed: number | null;
  created_at: string;
  applicant_count: number;
  photos: string[];
  applicants?: Applicant[];
};

const CARD_IMAGE_HEIGHT = 140;

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  open:        { label: 'Open',        icon: 'checkmark-circle', color: '#059669', bg: '#ECFDF5' },
  in_progress: { label: 'In Progress', icon: 'build-outline',   color: '#2563EB', bg: '#EFF6FF' },
  completed:   { label: 'Completed',   icon: 'shield-checkmark', color: '#64748B', bg: '#F1F5F9' },
  closed:      { label: 'Closed',      icon: 'close-circle',    color: '#DC2626', bg: '#FEF2F2' },
};

/* ─── Component ────────────────────────────────────────────── */

export default function EnterpriseJobsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';
  const indigoFaint = isDark ? 'rgba(129,140,248,0.12)' : 'rgba(79,70,229,0.06)';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  /* ── Data fetching ────────────────────────────────────────── */

  const fetchJobs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch jobs posted by this enterprise user
    const { data: jobsData, error: jobsErr } = await supabase
      .from('jobs')
      .select('id, title, trade_category, suburb, urgency, status, workers_needed, created_at, photo_urls')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (jobsErr || !jobsData) {
      setJobs([]);
      setLoading(false);
      return;
    }

    if (jobsData.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    // Fetch application counts and photos per job
    const jobIds = jobsData.map((j) => j.id);
    const [appsRes, photosRes] = await Promise.all([
      supabase.from('applications').select('job_id').in('job_id', jobIds),
      supabase.from('job_photos').select('job_id, file_path').in('job_id', jobIds).order('is_cover', { ascending: false }),
    ]);

    const countMap: Record<string, number> = {};
    for (const app of appsRes.data ?? []) {
      countMap[app.job_id] = (countMap[app.job_id] || 0) + 1;
    }

    const photoMap: Record<string, string[]> = {};
    for (const photo of photosRes.data ?? []) {
      if (!photoMap[photo.job_id]) photoMap[photo.job_id] = [];
      photoMap[photo.job_id].push(photo.file_path);
    }

    setJobs(
      jobsData.map((j: any) => ({
        ...j,
        applicant_count: countMap[j.id] || 0,
        photos: photoMap[j.id]?.length
          ? photoMap[j.id]
          : Array.isArray(j.photo_urls) ? j.photo_urls : [],
      })),
    );
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchJobs();
    }, [fetchJobs]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }

  /* ── Applicant management ────────────────────────────────── */

  async function toggleApplicants(jobId: string) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    setLoadingApplicants(true);

    const { data } = await supabase
      .from('applications')
      .select('id, builder_id, status, message, created_at, builder_profiles(business_name, trade_category, suburb, profile_photo_url)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    const applicants: Applicant[] = (data ?? []).map((a: any) => ({
      id: a.id,
      builder_id: a.builder_id,
      status: a.status,
      message: a.message,
      created_at: a.created_at,
      business_name: a.builder_profiles?.business_name ?? 'Unknown',
      trade_category: a.builder_profiles?.trade_category ?? '',
      suburb: a.builder_profiles?.suburb ?? '',
      profile_photo_url: a.builder_profiles?.profile_photo_url ?? null,
    }));

    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applicants } : j));
    setLoadingApplicants(false);
  }

  async function handleUpdateApp(appId: string, jobId: string, newStatus: 'accepted' | 'rejected') {
    setUpdatingAppId(appId);
    await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    // Refresh applicants for this job
    const { data } = await supabase
      .from('applications')
      .select('id, builder_id, status, message, created_at, builder_profiles(business_name, trade_category, suburb, profile_photo_url)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    const applicants: Applicant[] = (data ?? []).map((a: any) => ({
      id: a.id, builder_id: a.builder_id, status: a.status, message: a.message, created_at: a.created_at,
      business_name: a.builder_profiles?.business_name ?? 'Unknown',
      trade_category: a.builder_profiles?.trade_category ?? '',
      suburb: a.builder_profiles?.suburb ?? '',
      profile_photo_url: a.builder_profiles?.profile_photo_url ?? null,
    }));

    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applicants, applicant_count: applicants.length } : j));
    setUpdatingAppId(null);
  }

  /* ── Render job card ──────────────────────────────────────── */

  const renderJob = useCallback(
    ({ item }: { item: Job }) => {
      const urg = URGENCY_CONFIG[item.urgency] ?? {
        label: item.urgency,
        icon: 'help-circle-outline' as const,
        color: '#64748b',
        bg: '#f1f5f9',
      };
      const stat = STATUS_CONFIG[item.status] ?? {
        label: item.status,
        icon: 'help-circle-outline' as const,
        color: '#64748b',
        bg: '#f1f5f9',
      };

      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: isDark ? colors.surface : '#fff',
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
            Shadows.sm,
          ]}
          onPress={() => router.push({ pathname: '/enterprise-job-detail', params: { id: item.id } } as any)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.title}`}
        >
          {/* Cover photo */}
          {item.photos.length > 0 ? (
            <Image
              source={{ uri: item.photos[0] }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="disk"
              placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
            />
          ) : (
            <LinearGradient
              colors={isDark ? ['#312e81', '#1e1b4b'] : ['#e0e7ff', '#c7d2fe']}
              style={styles.cardImagePlaceholder}
            >
              <Ionicons name="image-outline" size={28} color={isDark ? '#6366f1' : '#a5b4fc'} />
            </LinearGradient>
          )}

          {/* Top row: trade pill + urgency pill + time */}
          <View style={styles.cardTopRow}>
            <View style={[styles.tradePill, { backgroundColor: indigoBg }]}>
              <Text style={[styles.tradePillText, { color: indigo }]}>{item.trade_category}</Text>
            </View>
            <View style={[styles.urgencyPill, { backgroundColor: urg.bg }]}>
              <Ionicons name={urg.icon as any} size={11} color={urg.color} />
              <Text style={[styles.urgencyPillText, { color: urg.color }]}>{urg.label}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {getRelativeTime(item.created_at)}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>{item.suburb}</Text>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Bottom row: status + applicants + workers needed */}
          <View style={styles.cardBottomRow}>
            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon} size={13} color={stat.color} />
              <Text style={[styles.statusText, { color: stat.color }]}>{stat.label}</Text>
            </View>

            {/* Applicants */}
            <View style={[styles.metricChip, { backgroundColor: indigoFaint }]}>
              <Ionicons name="people" size={13} color={indigo} />
              <Text style={[styles.metricChipText, { color: indigo }]}>
                {item.applicant_count} {item.applicant_count === 1 ? 'applicant' : 'applicants'}
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            {/* Workers needed */}
            {item.workers_needed != null && item.workers_needed > 0 && (
              <View style={styles.workersChip}>
                <MaterialIcons name="groups" size={14} color={colors.textSecondary} />
                <Text style={[styles.workersText, { color: colors.textSecondary }]}>
                  {item.workers_needed} needed
                </Text>
              </View>
            )}
          </View>

          {/* Applicants toggle button */}
          {item.applicant_count > 0 && (
            <Pressable
              onPress={() => toggleApplicants(item.id)}
              style={[styles.applicantsToggle, { borderTopColor: colors.border }]}
            >
              <Ionicons name="people-outline" size={16} color={indigo} />
              <Text style={[styles.applicantsToggleText, { color: indigo }]}>
                {expandedJobId === item.id ? 'Hide' : 'View'} Applicants ({item.applicant_count})
              </Text>
              <Ionicons name={expandedJobId === item.id ? 'chevron-up' : 'chevron-down'} size={16} color={indigo} />
            </Pressable>
          )}

          {/* Fold-down applicant list */}
          {expandedJobId === item.id && (
            <View style={[styles.applicantsList, { borderTopColor: colors.border }]}>
              {loadingApplicants ? (
                <ActivityIndicator color={indigo} style={{ paddingVertical: 16 }} />
              ) : !item.applicants?.length ? (
                <Text style={[styles.noApplicants, { color: colors.textSecondary }]}>No applicants yet</Text>
              ) : (
                item.applicants.map((app) => {
                  const appAvatarUri = app.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.business_name)}&background=4f46e5&color=fff&size=80`;
                  const statusColor = app.status === 'accepted' ? '#059669' : app.status === 'rejected' ? '#dc2626' : '#d97706';
                  const statusBg = app.status === 'accepted' ? '#ecfdf5' : app.status === 'rejected' ? '#fef2f2' : '#fffbeb';

                  return (
                    <View key={app.id} style={[styles.applicantRow, { borderBottomColor: colors.borderLight }]}>
                      <Image source={{ uri: appAvatarUri }} style={styles.applicantAvatar} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.applicantName, { color: colors.text }]}>{app.business_name}</Text>
                        <Text style={[styles.applicantMeta, { color: colors.textSecondary }]}>{app.trade_category} — {app.suburb}</Text>
                        {app.message && <Text style={[styles.applicantMsg, { color: colors.textSecondary }]} numberOfLines={2}>"{app.message}"</Text>}
                      </View>

                      {/* Status badge or action buttons */}
                      {app.status === 'pending' ? (
                        <View style={styles.appActions}>
                          <Pressable
                            style={[styles.acceptBtn, { opacity: updatingAppId === app.id ? 0.5 : 1 }]}
                            onPress={() => handleUpdateApp(app.id, item.id, 'accepted')}
                            disabled={!!updatingAppId}
                          >
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </Pressable>
                          <Pressable
                            style={[styles.rejectBtn, { opacity: updatingAppId === app.id ? 0.5 : 1 }]}
                            onPress={() => handleUpdateApp(app.id, item.id, 'rejected')}
                            disabled={!!updatingAppId}
                          >
                            <Ionicons name="close" size={14} color="#dc2626" />
                          </Pressable>
                        </View>
                      ) : (
                        <View style={[styles.appStatusBadge, { backgroundColor: statusBg }]}>
                          <Text style={[styles.appStatusText, { color: statusColor }]}>{app.status}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </Pressable>
      );
    },
    [isDark, colors, indigo, indigoBg, indigoFaint, router, expandedJobId, loadingApplicants, updatingAppId],
  );

  /* ── Empty state ──────────────────────────────────────────── */

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: indigoBg }]}>
          <Ionicons name="briefcase-outline" size={48} color={indigo} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No jobs posted yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Post your first job to start finding qualified builders and tradies for your projects.
        </Text>
        <Pressable
          onPress={() => router.push('/post-job' as any)}
          style={({ pressed }) => [styles.emptyCta, { borderColor: indigo, opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Post your first job"
        >
          <Ionicons name="add-circle-outline" size={20} color={indigo} />
          <Text style={[styles.emptyCtaText, { color: indigo }]}>Post Your First Job</Text>
        </Pressable>
      </View>
    );
  }

  /* ── Main render ──────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Indigo gradient header */}
      <LinearGradient
        colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4f46e5', '#4338ca']}
        style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Job Posts</Text>
            <Text style={styles.headerSubtitle}>
              {loading ? 'Loading...' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} posted`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={indigo} style={{ marginTop: 80 }} />
      ) : jobs.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={indigo}
            />
          }
        />
      )}

      {/* Floating Post Job button */}
      {!loading && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: indigo,
              bottom: insets.bottom + Spacing.xl,
              opacity: pressed ? 0.85 : 1,
            },
            Shadows.lg,
          ]}
          onPress={() => router.push('/post-job' as any)}
          accessibilityRole="button"
          accessibilityLabel="Post a new job"
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Post Job</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Type.h2,
    color: '#fff',
  },
  headerSubtitle: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginTop: 1,
  },

  /* List */
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 100,
  },

  /* Card */
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Card top row */
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  tradePill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tradePillText: {
    ...Type.label,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyPillText: {
    ...Type.micro,
    fontWeight: '700',
  },
  timeText: {
    ...Type.caption,
    fontWeight: '500',
  },

  /* Title */
  cardTitle: {
    ...Type.h3,
    fontWeight: '700',
    marginBottom: 4,
    paddingHorizontal: Spacing.lg,
  },

  /* Location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  locationText: {
    ...Type.caption,
    fontWeight: '500',
  },

  /* Divider */
  divider: {
    height: 1,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
  },

  /* Card bottom row */
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    ...Type.label,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metricChipText: {
    ...Type.label,
    fontWeight: '600',
  },
  workersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workersText: {
    ...Type.caption,
    fontWeight: '500',
  },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Type.h2,
  },
  emptySubtitle: {
    ...Type.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCta: {
    marginTop: Spacing.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing['3xl'],
  },
  emptyCtaText: {
    ...Type.btnPrimary,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
  },
  fabText: {
    ...Type.btnSecondary,
    color: '#fff',
    fontWeight: '700',
  },

  /* Applicants toggle */
  applicantsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  applicantsToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Applicants list */
  applicantsList: {
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  noApplicants: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  applicantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  applicantMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  applicantMsg: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 16,
  },
  appActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  appStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
