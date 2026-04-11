/**
 * Enterprise Job Detail — owner view for managing a posted job.
 * Shows job info, photos, details grid, application stats, and applicant management.
 * Indigo theme matching the enterprise hub.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Job = {
  id: string; title: string; description: string | null; trade_category: string;
  urgency: string; suburb: string; postcode: string; budget: string | null;
  status: string; created_at: string; customer_id: string;
  workers_needed: number | null; day_rate: string | null;
  contract_duration: string | null; start_date: string | null;
  site_requirements: string | null; photo_urls: string[] | null;
};

type Applicant = {
  id: string; builder_id: string; status: string; message: string | null;
  created_at: string; business_name: string; trade_category: string;
  suburb: string; profile_photo_url: string | null; phone: string | null;
};

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function EnterpriseJobDetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';

  const [job, setJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicants, setShowApplicants] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    const { data: j } = await supabase.from('jobs')
      .select('id, title, description, trade_category, suburb, postcode, urgency, budget, status, created_at, customer_id, workers_needed, day_rate, contract_duration, start_date, site_requirements, photo_urls')
      .eq('id', id).single();
    if (!j) { setLoading(false); return; }
    setJob(j as any);

    // Photos
    const { data: ph } = await supabase.from('job_photos').select('file_path').eq('job_id', id).order('is_cover', { ascending: false });
    const fromTable = (ph ?? []).map((p: any) => p.file_path);
    setPhotos(fromTable.length > 0 ? fromTable : Array.isArray(j.photo_urls) ? j.photo_urls : []);

    // Applicants
    const { data: apps } = await supabase.from('applications')
      .select('id, builder_id, status, message, created_at, builder_profiles(business_name, trade_category, suburb, profile_photo_url, phone)')
      .eq('job_id', id).order('created_at', { ascending: false });
    setApplicants((apps ?? []).map((a: any) => ({
      id: a.id, builder_id: a.builder_id, status: a.status, message: a.message, created_at: a.created_at,
      business_name: a.builder_profiles?.business_name ?? 'Unknown',
      trade_category: a.builder_profiles?.trade_category ?? '',
      suburb: a.builder_profiles?.suburb ?? '',
      profile_photo_url: a.builder_profiles?.profile_photo_url ?? null,
      phone: a.builder_profiles?.phone ?? null,
    })));
    setLoading(false);
  }, [id]);

  useEffect(() => { if (id) loadJob(); }, [id, loadJob]);

  async function handleUpdateApp(appId: string, newStatus: 'accepted' | 'rejected') {
    setUpdatingId(appId);
    await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    await loadJob();
    setUpdatingId(null);
  }

  async function handleCloseJob() {
    Alert.alert('Close Job', 'Stop builders from applying?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: async () => {
        await supabase.from('jobs').update({ status: 'closed' }).eq('id', id);
        setJob(prev => prev ? { ...prev, status: 'closed' } : prev);
      }},
    ]);
  }

  if (loading || !job) {
    return <View style={[s.container, { backgroundColor: colors.canvas }]}><ActivityIndicator color={indigo} style={{ marginTop: 100 }} /></View>;
  }

  const pending = applicants.filter(a => a.status === 'pending').length;
  const accepted = applicants.filter(a => a.status === 'accepted').length;
  const rejected = applicants.filter(a => a.status === 'rejected').length;

  return (
    <View style={[s.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4338ca', '#4f46e5']} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{job.title}</Text>
            <Text style={s.headerSub}>{job.trade_category} · {job.suburb} · Posted {relTime(job.created_at)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Edit / Close */}
        <View style={s.actionRow}>
          <Pressable onPress={() => router.push({ pathname: '/post-job', params: { editId: job.id, editTitle: job.title, editTrade: job.trade_category, editUrgency: job.urgency, editDescription: job.description || '', editSuburb: job.suburb, editPostcode: job.postcode } } as any)} style={[s.actionBtn, { borderColor: indigo }]}>
            <Ionicons name="create-outline" size={16} color={indigo} />
            <Text style={[s.actionBtnText, { color: indigo }]}>Edit Job</Text>
          </Pressable>
          {job.status === 'open' && (
            <Pressable onPress={handleCloseJob} style={[s.actionBtn, { borderColor: '#dc2626' }]}>
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={[s.actionBtnText, { color: '#dc2626' }]}>Close Job</Text>
            </Pressable>
          )}
          <View style={[s.statusPill, { backgroundColor: job.status === 'open' ? '#ecfdf5' : '#fef2f2' }]}>
            <Text style={{ color: job.status === 'open' ? '#059669' : '#dc2626', fontSize: 12, fontWeight: '700' }}>{job.status}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={[s.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Job Description</Text>
          <Text style={[s.description, { color: colors.text }]}>{job.description || 'No description provided.'}</Text>
        </View>

        {/* Job Details Grid */}
        {(job.day_rate || job.budget || job.workers_needed || job.contract_duration || job.start_date) && (
          <View style={[s.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Job Details</Text>
            <View style={s.detailsGrid}>
              {job.day_rate && <View style={s.detailItem}><Text style={s.detailLabel}>Day Rate</Text><Text style={[s.detailValue, { color: colors.text }]}>{job.day_rate}</Text></View>}
              {job.budget && <View style={s.detailItem}><Text style={s.detailLabel}>Budget</Text><Text style={[s.detailValue, { color: colors.text }]}>{job.budget}</Text></View>}
              {job.contract_duration && <View style={s.detailItem}><Text style={s.detailLabel}>Duration</Text><Text style={[s.detailValue, { color: colors.text }]}>{job.contract_duration}</Text></View>}
              {job.start_date && <View style={s.detailItem}><Text style={s.detailLabel}>Start Date</Text><Text style={[s.detailValue, { color: colors.text }]}>{new Date(job.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>}
              {job.workers_needed && job.workers_needed > 0 && <View style={s.detailItem}><Text style={s.detailLabel}>Workers Needed</Text><Text style={[s.detailValue, { color: colors.text }]}>{job.workers_needed}</Text></View>}
            </View>
            {job.site_requirements && (
              <View style={{ marginTop: Spacing.md }}>
                <Text style={s.detailLabel}>Site Requirements</Text>
                <Text style={[s.description, { color: colors.text, marginTop: 4 }]}>{job.site_requirements}</Text>
              </View>
            )}
          </View>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <View style={[s.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Site Photos & Plans ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={s.photo} contentFit="cover" cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Application Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Pending', count: pending, color: '#d97706' },
            { label: 'Accepted', count: accepted, color: '#059669' },
            { label: 'Rejected', count: rejected, color: '#dc2626' },
          ].map(st => (
            <View key={st.label} style={[s.statBox, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
              <Text style={[s.statNumber, { color: colors.text }]}>{st.count}</Text>
              <Text style={[s.statLabel, { color: st.color }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Applicants */}
        {applicants.length > 0 && (
          <View style={[s.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            <Pressable onPress={() => setShowApplicants(!showApplicants)} style={s.applicantsHeader}>
              <Ionicons name="people-outline" size={18} color={indigo} />
              <Text style={[s.cardTitle, { flex: 1, marginBottom: 0 }]}>View Applicants</Text>
              <View style={[s.countBadge, { backgroundColor: indigoBg }]}><Text style={[s.countBadgeText, { color: indigo }]}>{applicants.length}</Text></View>
              <Ionicons name={showApplicants ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </Pressable>

            {showApplicants && applicants.map(app => {
              const avatarUri = app.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.business_name)}&background=4f46e5&color=fff&size=80`;
              const statusColor = app.status === 'accepted' ? '#059669' : app.status === 'rejected' ? '#dc2626' : '#d97706';
              return (
                <View key={app.id} style={[s.appCard, { borderColor: colors.border }]}>
                  <View style={s.appRow}>
                    <Image source={{ uri: avatarUri }} style={s.appAvatar} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.appName, { color: colors.text }]}>{app.business_name}</Text>
                      <Text style={[s.appMeta, { color: colors.textSecondary }]}>{app.trade_category} · {app.suburb} · Applied {relTime(app.created_at)}</Text>
                    </View>
                    <View style={[s.appStatus, { backgroundColor: statusColor + '15' }]}>
                      <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>{app.status}</Text>
                    </View>
                  </View>

                  {app.message && (
                    <View style={[s.appMsgBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
                      <Text style={[s.appMsgText, { color: colors.text }]}>"{app.message}"</Text>
                    </View>
                  )}

                  {app.status === 'accepted' && app.phone && (
                    <Text style={{ color: '#059669', fontSize: 13, fontWeight: '600', marginTop: 6 }}>Phone: {app.phone}</Text>
                  )}

                  <View style={s.appActions}>
                    {app.status === 'pending' ? (
                      <>
                        <Pressable onPress={() => handleUpdateApp(app.id, 'accepted')} style={[s.appBtn, { backgroundColor: '#059669' }]} disabled={!!updatingId}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={s.appBtnTextW}>Accept</Text>
                        </Pressable>
                        <Pressable onPress={() => handleUpdateApp(app.id, 'rejected')} style={[s.appBtn, { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }]} disabled={!!updatingId}>
                          <Ionicons name="close" size={14} color="#dc2626" />
                          <Text style={[s.appBtnTextD, { color: '#dc2626' }]}>Reject</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable onPress={() => router.push({ pathname: '/builder-profile', params: { id: app.builder_id } } as any)} style={[s.appBtn, { borderWidth: 1, borderColor: colors.border }]}>
                          <Ionicons name="person-outline" size={14} color={colors.text} />
                          <Text style={[s.appBtnTextD, { color: colors.text }]}>View Profile</Text>
                        </Pressable>
                        <Pressable onPress={() => router.push({ pathname: '/messages', params: { recipientId: app.builder_id } } as any)} style={[s.appBtn, { borderWidth: 1, borderColor: colors.border }]}>
                          <Ionicons name="mail-outline" size={14} color={colors.text} />
                          <Text style={[s.appBtnTextD, { color: colors.text }]}>Message</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {applicants.length === 0 && (
          <View style={[s.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border, alignItems: 'center', paddingVertical: Spacing['3xl'] }]}>
            <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>No applicants yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  statusPill: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginBottom: Spacing.md },
  description: { fontSize: 14, lineHeight: 22 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  detailItem: { width: '45%' as any },
  detailLabel: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  detailValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  photo: { width: 160, height: 120, borderRadius: Radius.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, ...Shadows.sm },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  applicantsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 12, fontWeight: '700' },
  appCard: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appAvatar: { width: 44, height: 44, borderRadius: 22 },
  appName: { fontSize: 15, fontWeight: '600' },
  appMeta: { fontSize: 11, marginTop: 1 },
  appStatus: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  appMsgBox: { padding: 10, borderRadius: 8, marginTop: 8 },
  appMsgText: { fontSize: 13, fontStyle: 'italic' },
  appActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  appBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  appBtnTextW: { color: '#fff', fontSize: 13, fontWeight: '600' },
  appBtnTextD: { fontSize: 13, fontWeight: '600' },
});
