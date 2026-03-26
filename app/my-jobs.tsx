import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - 68;
const PHOTO_HEIGHT = 180;

/* ─── Helpers (matching job-detail) ───────────────────────── */

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const posted = new Date(dateStr).getTime();
  const diffMs = now - posted;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const URGENCY_CONFIG: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  asap: { label: 'ASAP', icon: 'alarm', color: '#DC2626', bg: '#FEF2F2' },
  this_week: { label: 'This Week', icon: 'time-outline', color: '#D97706', bg: '#FFFBEB' },
  flexible: { label: 'Flexible', icon: 'calendar-outline', color: '#059669', bg: '#ECFDF5' },
};

/* ─── Types ────────────────────────────────────────────────── */

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
    profile_photo_url: string | null;
  } | null;
};

type JobPhoto = { id: string; file_path: string; is_cover: boolean };

type Job = {
  id: string;
  title: string;
  trade_category: string;
  description: string;
  urgency: string;
  status: string;
  suburb: string;
  postcode: string;
  budget: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
};

/* ─── Component ────────────────────────────────────────────── */

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
  const [jobPhotos, setJobPhotos] = useState<Record<string, JobPhoto[]>>({});
  const [activePhotoIndices, setActivePhotoIndices] = useState<Record<string, number>>({});

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
      .select('id, title, trade_category, description, urgency, status, suburb, postcode, budget, contact_phone, contact_email, created_at')
      .eq('customer_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
      fetchPhotosForJobs(data.map((j) => j.id));
    }
    setLoading(false);
  }

  async function fetchPhotosForJobs(jobIds: string[]) {
    if (jobIds.length === 0) return;
    const { data } = await supabase
      .from('job_photos')
      .select('id, file_path, is_cover, job_id')
      .in('job_id', jobIds)
      .order('is_cover', { ascending: false });

    if (data) {
      const grouped: Record<string, JobPhoto[]> = {};
      for (const photo of data) {
        const jid = (photo as any).job_id;
        if (!grouped[jid]) grouped[jid] = [];
        grouped[jid].push({ id: photo.id, file_path: photo.file_path, is_cover: photo.is_cover });
      }
      setJobPhotos(grouped);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }

  async function fetchApplicants(jobId: string) {
    setLoadingApplicants(true);

    // Fetch applications
    const { data: appsData, error } = await supabase
      .from('applications')
      .select('id, builder_id, message, status, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && appsData && appsData.length > 0) {
      // Fetch builder profiles for all applicants
      const builderIds = appsData.map((a: any) => a.builder_id);
      const { data: profiles } = await supabase
        .from('builder_profiles')
        .select('user_id, business_name, trade_category, suburb, phone, profile_photo_url')
        .in('user_id', builderIds);

      const profileMap = new Map<string, any>();
      for (const p of profiles ?? []) {
        profileMap.set(p.user_id, p);
      }

      setApplicants(appsData.map((a: any) => ({
        ...a,
        builder_profiles: profileMap.get(a.builder_id) ?? null,
      })));
    } else {
      setApplicants([]);
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
            await supabase
              .from('applications')
              .update({ status: 'accepted' })
              .eq('id', application.id);
            await supabase
              .from('applications')
              .update({ status: 'rejected' })
              .eq('job_id', jobId)
              .neq('id', application.id);
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

  function handleEdit(job: Job) {
    router.push({
      pathname: '/post-job',
      params: {
        editId: job.id,
        editTitle: job.title,
        editTrade: job.trade_category,
        editUrgency: job.urgency,
        editDescription: job.description,
        editSuburb: job.suburb,
        editPostcode: job.postcode,
        editContactPhone: job.contact_phone ?? '',
        editContactEmail: job.contact_email ?? '',
      },
    } as any);
  }

  function handleDelete(job: Job) {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${job.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('jobs')
              .delete()
              .eq('id', job.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setJobs((prev) => prev.filter((j) => j.id !== job.id));
            }
          },
        },
      ],
    );
  }

  /* ─── Applicant status helpers ──────────────────────────── */

  function getAppStatusStyle(status: string) {
    switch (status) {
      case 'accepted':
        return { bg: '#ECFDF5', color: '#059669' };
      case 'rejected':
        return { bg: '#FEF2F2', color: '#DC2626' };
      case 'pending':
      default:
        return { bg: '#FFFBEB', color: '#D97706' };
    }
  }

  /* ─── Render job card ───────────────────────────────────── */

  const renderJob = useCallback(
    ({ item }: { item: Job }) => {
      const isExpanded = expandedJobId === item.id;
      const urg = URGENCY_CONFIG[item.urgency] ?? { label: item.urgency, icon: 'help-circle-outline' as const, color: '#64748b', bg: '#f1f5f9' };
      const photos = jobPhotos[item.id] ?? [];
      const activeIdx = activePhotoIndices[item.id] ?? 0;

      return (
        <View style={[styles.card, Shadows.sm]}>
          {/* ── Photo carousel ── */}
          {photos.length > 0 && (
            <View style={styles.photoSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={PHOTO_WIDTH}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / PHOTO_WIDTH);
                  setActivePhotoIndices((prev) => ({ ...prev, [item.id]: idx }));
                }}
                style={[styles.photoCarousel, { width: PHOTO_WIDTH }]}
              >
                {photos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.file_path }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.photoDots}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.photoDot, { backgroundColor: i === activeIdx ? '#0F6E56' : '#CBD5E1' }]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Card header — trade + urgency + time pills ── */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.tradePill}>
              <Text style={styles.tradePillText}>{item.trade_category}</Text>
            </View>
            <View style={[styles.urgencyPill, { backgroundColor: urg.bg }]}>
              <Ionicons name={urg.icon} size={12} color={urg.color} />
              <Text style={[styles.urgencyPillText, { color: urg.color }]}>{urg.label}</Text>
            </View>
            <Text style={styles.timeText}>{getRelativeTime(item.created_at)}</Text>
          </View>

          {/* ── Title ── */}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          {/* ── Fact chips (matching job-detail) ── */}
          <View style={styles.factsRow}>
            <View style={styles.factChip}>
              <Ionicons name="location" size={14} color="#0369A1" />
              <Text style={styles.factChipText}>{item.suburb}, {item.postcode}</Text>
            </View>
            {item.budget && (
              <View style={styles.factChip}>
                <Ionicons name="cash" size={14} color="#16A34A" />
                <Text style={styles.factChipText}>{item.budget}</Text>
              </View>
            )}
            <View style={[styles.factChip, { backgroundColor: item.status === 'open' ? '#ECFDF5' : item.status === 'assigned' ? '#FFFBEB' : '#FEF2F2' }]}>
              <Ionicons
                name={item.status === 'open' ? 'checkmark-circle' : item.status === 'assigned' ? 'time' : 'close-circle'}
                size={14}
                color={item.status === 'open' ? '#059669' : item.status === 'assigned' ? '#D97706' : '#DC2626'}
              />
              <Text style={[styles.factChipText, { color: item.status === 'open' ? '#059669' : item.status === 'assigned' ? '#D97706' : '#DC2626' }]}>
                {item.status === 'open' ? 'Open' : item.status === 'assigned' ? 'Assigned' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* ── Description ── */}
          {item.description ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.descriptionText} numberOfLines={3}>{item.description}</Text>
            </>
          ) : null}

          {/* ── Action buttons row — Edit / Delete / Applicants ── */}
          <View style={styles.divider} />
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              onPress={() => handleEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.title}`}
            >
              <MaterialIcons name="edit" size={16} color="#0F6E56" />
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
            <View style={styles.actionDivider} />
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
            >
              <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
              <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
            </Pressable>
            <View style={styles.actionDivider} />
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
              onPress={() => toggleExpand(item.id)}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? `Hide applicants for ${item.title}` : `View applicants for ${item.title}`}
              accessibilityState={{ expanded: isExpanded }}
            >
              <Ionicons name={isExpanded ? 'chevron-up' : 'people'} size={16} color="#0F6E56" />
              <Text style={styles.actionBtnText}>{isExpanded ? 'Hide' : 'Applicants'}</Text>
            </Pressable>
          </View>

          {/* ── Expanded applicants ── */}
          {isExpanded && (
            <View style={styles.applicantsSection}>
              {loadingApplicants ? (
                <ActivityIndicator color="#0F6E56" style={{ marginVertical: 16 }} />
              ) : applicants.length === 0 ? (
                <View style={styles.noApplicantsWrap}>
                  <Ionicons name="people-outline" size={28} color="#94A3B8" />
                  <Text style={styles.noApplicantsText}>No applications yet</Text>
                </View>
              ) : (
                applicants.map((app) => {
                  const appStyle = getAppStatusStyle(app.status);
                  return (
                    <View key={app.id} style={styles.applicantCard}>
                      {/* Applicant header */}
                      <View style={styles.applicantHeader}>
                        {app.builder_profiles?.profile_photo_url ? (
                          <Image
                            source={{ uri: app.builder_profiles.profile_photo_url }}
                            style={styles.applicantAvatar}
                          />
                        ) : (
                          <View style={styles.applicantInitials}>
                            <Text style={styles.applicantInitialsText}>
                              {(app.builder_profiles?.business_name ?? 'U')[0].toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.applicantName}>
                            {app.builder_profiles?.business_name ?? 'Unknown Builder'}
                          </Text>
                          <Text style={styles.applicantMeta}>
                            {app.builder_profiles?.trade_category} — {app.builder_profiles?.suburb}
                          </Text>
                        </View>
                        <View style={[styles.applicantStatusBadge, { backgroundColor: appStyle.bg }]}>
                          <Text style={[styles.applicantStatusText, { color: appStyle.color }]}>
                            {app.status}
                          </Text>
                        </View>
                      </View>

                      {/* Message */}
                      {app.message ? (
                        <Text style={styles.applicantMessage}>"{app.message}"</Text>
                      ) : null}

                      {/* Accept / Reject */}
                      {app.status === 'pending' && item.status === 'open' && (
                        <View style={styles.applicantActions}>
                          <Pressable
                            style={({ pressed }) => [styles.acceptBtn, (updatingId === app.id || pressed) && { opacity: 0.7 }]}
                            onPress={() => handleAccept(app, item.id)}
                            disabled={updatingId === app.id}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [styles.rejectBtn, (updatingId === app.id || pressed) && { opacity: 0.7 }]}
                            onPress={() => handleReject(app.id, item.id)}
                            disabled={updatingId === app.id}
                          >
                            <Ionicons name="close" size={16} color="#DC2626" />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </Pressable>
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
    [expandedJobId, applicants, loadingApplicants, updatingId, colors, jobPhotos, activePhotoIndices],
  );

  /* ─── Main render ───────────────────────────────────────── */

  return (
    <View style={styles.container}>
      {/* ── Slim green header (matching job-detail) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>My Jobs</Text>
        </View>
        <View style={styles.headerSubRow}>
          <Text style={styles.headerSubText}>Manage your posted jobs</Text>
        </View>
      </View>

      <Animated.View entering={FadeInUp.duration(300).delay(100)} style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color="#0F6E56" style={{ marginTop: 60 }} />
      ) : jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="clipboard-outline" size={48} color="#0d9488" />
          </View>
          <Text style={styles.emptyTitle}>No jobs posted yet</Text>
          <Text style={styles.emptySubtitle}>Post a job to find the right tradie for your project.</Text>
          <Pressable
            onPress={() => router.push('/post-job')}
            style={({ pressed }) => [styles.emptyOutlineCta, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Post a Job"
          >
            <Text style={styles.emptyOutlineCtaText}>Post a Job</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F6E56" />
          }
        />
      )}
      </Animated.View>
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EC',
  },

  /* Header — slim green bar (matching job-detail) */
  header: {
    backgroundColor: '#0F6E56',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Type.h2,
    flex: 1,
    color: '#fff',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingLeft: 42,
  },
  headerSubText: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  /* List */
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 60,
  },

  /* Card (matching job-detail) */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },

  /* Photo carousel */
  photoSection: {
    marginBottom: 14,
  },
  photoCarousel: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 12,
  },
  photoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  photoDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  /* Card header pills */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tradePill: {
    backgroundColor: '#0F6E56',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tradePillText: {
    ...Type.label,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyPillText: {
    ...Type.label,
    fontWeight: '600',
  },
  timeText: {
    ...Type.caption,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Title */
  cardTitle: {
    ...Type.h3,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },

  /* Fact chips (matching job-detail) */
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  factChipText: {
    ...Type.captionSemiBold,
    color: '#334155',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },

  /* Description */
  descriptionText: {
    ...Type.body,
    color: '#334155',
  },

  /* Action buttons row */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionBtnText: {
    ...Type.captionSemiBold,
    color: '#0F6E56',
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },

  /* Applicants section */
  applicantsSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  noApplicantsWrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  noApplicantsText: {
    ...Type.body,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Applicant card */
  applicantCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  applicantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  applicantInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantInitialsText: {
    ...Type.body,
    color: '#fff',
    fontWeight: '700',
  },
  applicantName: {
    ...Type.bodySemiBold,
    fontWeight: '700',
    color: '#0f172a',
  },
  applicantMeta: {
    ...Type.caption,
    color: '#64748b',
    textTransform: 'capitalize',
    marginTop: 1,
  },
  applicantStatusBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  applicantStatusText: {
    ...Type.label,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  applicantMessage: {
    ...Type.caption,
    fontStyle: 'italic',
    color: '#334155',
    paddingLeft: 46,
  },

  /* Accept / Reject buttons */
  applicantActions: {
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 46,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  acceptBtnText: {
    ...Type.btnSecondary,
    color: '#fff',
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    ...Type.btnSecondary,
    color: '#DC2626',
    fontWeight: '700',
  },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    ...Type.h2,
    color: '#0f172a',
  },
  emptySubtitle: {
    ...Type.body,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyOutlineCta: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyOutlineCtaText: {
    ...Type.btnPrimary,
    color: '#0d9488',
  },
});
