import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH = SCREEN_WIDTH - 48;
const PHOTO_HEIGHT = 240;

/* ─── Helpers ──────────────────────────────────────────────── */

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

function getDisplayName(fullName: string | null): string {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function getInitials(fullName: string | null): string {
  if (!fullName) return 'C';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const URGENCY_CONFIG: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  asap: { label: 'ASAP', icon: 'alarm', color: '#DC2626', bg: '#FEF2F2' },
  this_week: { label: 'This Week', icon: 'time-outline', color: '#D97706', bg: '#FFFBEB' },
  flexible: { label: 'Flexible', icon: 'calendar-outline', color: '#059669', bg: '#ECFDF5' },
};

/* ─── Types ────────────────────────────────────────────────── */

type Job = {
  id: string;
  title: string;
  description: string | null;
  trade_category: string;
  urgency: string;
  suburb: string;
  postcode: string;
  budget: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
  customer_id: string;
};

type JobPhoto = { id: string; file_path: string; is_cover: boolean };
type JobDocument = { id: string; file_path: string; file_name: string | null };
type CustomerInfo = { full_name: string | null; avatar_url: string | null };

/* ─── Component ────────────────────────────────────────────── */

export default function JobDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationAccepted, setApplicationAccepted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const sheetRef = useRef<BottomSheet>(null);
  const sheetSnaps = useMemo(() => ['45%'], []);

  /* ─── Data fetching ──────────────────────────────────────── */

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

  async function loadAll() {
    setLoading(true);

    const [jobRes, photoRes, docRes] = await Promise.all([
      supabase.from('jobs').select('id, title, description, trade_type, suburb, postcode, urgency, budget, status, created_at, customer_id, contact_phone, contact_email').eq('id', id).single(),
      supabase.from('job_photos').select('id, file_path, is_cover').eq('job_id', id).order('is_cover', { ascending: false }),
      supabase.from('job_documents').select('id, file_path, file_name').eq('job_id', id),
    ]);

    if (jobRes.data) {
      setJob(jobRes.data);
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', jobRes.data.customer_id)
        .maybeSingle();
      setCustomer(prof);
    }

    if (photoRes.data) setPhotos(photoRes.data);
    if (docRes.data) setDocuments(docRes.data);

    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setCurrentUserId(userData.user.id);
      const { data: app } = await supabase
        .from('applications')
        .select('id, status')
        .eq('job_id', id)
        .eq('builder_id', userData.user.id)
        .maybeSingle();
      if (app) {
        setAlreadyApplied(true);
        if (app.status === 'accepted') setApplicationAccepted(true);
      }
    }

    setLoading(false);
  }

  /* ─── Apply flow ─────────────────────────────────────────── */

  async function handleApply() {
    if (alreadyApplied) {
      sheetRef.current?.expand();
      return;
    }

    setApplying(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      Alert.alert('Error', 'You must be logged in to apply.');
      setApplying(false);
      return;
    }

    const { error: insertError } = await supabase.from('applications').insert({
      job_id: id,
      builder_id: userData.user.id,
      message: null,
      status: 'pending',
    });

    setApplying(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setAlreadyApplied(true);
        sheetRef.current?.expand();
      } else {
        Alert.alert('Error', insertError.message);
      }
      return;
    }

    setAlreadyApplied(true);
    sheetRef.current?.expand();
  }

  /* ─── Bottom sheet backdrop ──────────────────────────────── */

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  /* ─── Loading state ──────────────────────────────────────── */

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: '#F5F2EC' }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </View>
        <ActivityIndicator color="#0F6E56" style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: '#F5F2EC' }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Job not found</Text>
          </View>
        </View>
        <View style={styles.centeredContainer}>
          <ThemedText type="subtitle">This job is no longer available</ThemedText>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ color: '#0F6E56', fontWeight: '600', fontSize: 16, marginTop: 8 }}>Go back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ─── Derived values ─────────────────────────────────────── */

  const urg = URGENCY_CONFIG[job.urgency] ?? { label: job.urgency, icon: 'help-circle-outline' as const, color: '#64748b', bg: '#f1f5f9' };
  const displayName = getDisplayName(customer?.full_name);
  const initials = getInitials(customer?.full_name);
  // Only show contact info if builder's application is accepted, or viewer is the job owner
  const isJobOwner = currentUserId === job.customer_id;
  const canSeeContact = isJobOwner || applicationAccepted;
  const hasContact = canSeeContact && (job.contact_phone || job.contact_email);

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <View style={[styles.container, { backgroundColor: '#F5F2EC' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Slim Header — back + title + pills ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
          </View>
          <View style={styles.headerSubRow}>
            <View style={styles.headerTradePill}>
              <Text style={styles.headerTradePillText}>{job.trade_category}</Text>
            </View>
            <View style={[styles.headerUrgencyPill, { backgroundColor: urg.bg }]}>
              <Ionicons name={urg.icon} size={12} color={urg.color} />
              <Text style={[styles.headerUrgencyText, { color: urg.color }]}>{urg.label}</Text>
            </View>
            <Text style={styles.headerSubText}>{getRelativeTime(job.created_at)}</Text>
          </View>
        </View>

        {/* ── 1. Contact buttons — copy to clipboard ── */}
        {hasContact && (
          <View style={styles.contactBtnRow}>
            {job.contact_phone && (
              <Pressable
                style={({ pressed }) => [styles.contactBtn, styles.contactBtnCall, pressed && { opacity: 0.8 }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(job.contact_phone!);
                  Alert.alert('Copied', `${job.contact_phone} copied to clipboard`);
                }}
              >
                <Ionicons name="call" size={18} color="#059669" />
                <Text style={styles.contactBtnLabel}>{job.contact_phone}</Text>
                <Ionicons name="copy-outline" size={16} color="#94A3B8" />
              </Pressable>
            )}
            {job.contact_email && (
              <Pressable
                style={({ pressed }) => [styles.contactBtn, styles.contactBtnEmail, pressed && { opacity: 0.8 }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(job.contact_email!);
                  Alert.alert('Copied', `${job.contact_email} copied to clipboard`);
                }}
              >
                <Ionicons name="mail" size={18} color="#2563EB" />
                <Text style={styles.contactBtnLabel} numberOfLines={1}>{job.contact_email}</Text>
                <Ionicons name="copy-outline" size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.cardsContainer}>

          {/* ── 2. Project Details — everything about the job in one card ── */}
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.sectionTitle}>Project Details</Text>

            {/* Quick facts row */}
            <View style={styles.factsRow}>
              <View style={styles.factChip}>
                <Ionicons name="location" size={14} color="#0369A1" />
                <Text style={styles.factChipText}>{job.suburb}, {job.postcode}</Text>
              </View>
              {job.budget && (
                <View style={styles.factChip}>
                  <Ionicons name="cash" size={14} color="#16A34A" />
                  <Text style={styles.factChipText}>{job.budget}</Text>
                </View>
              )}
              <View style={[styles.factChip, { backgroundColor: urg.bg }]}>
                <Ionicons name={urg.icon} size={14} color={urg.color} />
                <Text style={[styles.factChipText, { color: urg.color }]}>{urg.label}</Text>
              </View>
              <View style={[styles.factChip, { backgroundColor: job.status === 'open' ? '#ECFDF5' : '#FEF2F2' }]}>
                <Ionicons
                  name={job.status === 'open' ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={job.status === 'open' ? '#059669' : '#DC2626'}
                />
                <Text style={[styles.factChipText, { color: job.status === 'open' ? '#059669' : '#DC2626' }]}>
                  {job.status === 'open' ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionDivider} />
            <Text style={styles.descriptionText}>
              {job.description || 'No description provided.'}
            </Text>

            {/* Posted by inline */}
            <View style={styles.postedByInline}>
              {customer?.avatar_url ? (
                <Image source={{ uri: customer.avatar_url }} style={styles.postedByAvatarTiny} />
              ) : (
                <View style={styles.postedByInitialsTiny}>
                  <Text style={styles.postedByInitialsTinyText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.postedByInlineText}>
                {displayName} · {job.suburb} · {getRelativeTime(job.created_at)}
              </Text>
            </View>
          </View>

          {/* ── 3. Photos ──────────────────────────────────── */}
          {photos.length > 0 && (
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={PHOTO_WIDTH}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / PHOTO_WIDTH);
                  setActivePhotoIndex(idx);
                }}
                style={[styles.photoCarousel, { width: PHOTO_WIDTH }]}
              >
                {photos.map((photo, i) => (
                  <Pressable
                    key={photo.id}
                    onPress={() => { setLightboxIndex(i); setLightboxVisible(true); }}
                  >
                    <Image
                      source={{ uri: photo.file_path }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.photoDots}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.photoDot, { backgroundColor: i === activePhotoIndex ? '#0F6E56' : '#CBD5E1' }]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── 4. Plans & Documents — at the bottom ─────── */}
          {documents.length > 0 && (
            <View style={[styles.card, Shadows.sm]}>
              <Text style={styles.sectionTitle}>Plans & Documents ({documents.length})</Text>
              {documents.map((doc) => {
                const fileName = doc.file_name || doc.file_path.split('/').pop() || 'Document';
                return (
                  <Pressable
                    key={doc.id}
                    style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.7 }]}
                    onPress={() => Linking.openURL(doc.file_path)}
                  >
                    <View style={styles.docIconWrap}>
                      <MaterialIcons name="insert-drive-file" size={22} color="#0F6E56" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docFileName} numberOfLines={1}>{fileName}</Text>
                      <Text style={styles.docMeta}>Tap to view</Text>
                    </View>
                    <MaterialIcons name="open-in-new" size={18} color="#94A3B8" />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Job closed banner */}
          {job.status !== 'open' && (
            <View style={[styles.card, { backgroundColor: '#FEF2F2' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="close-circle" size={20} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 15 }}>This job is no longer open</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky Footer — Apply + Quick Contact ──────────── */}
      {job.status === 'open' && (
        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.footerRow}>
            {/* Copy contact icons */}
            {job.contact_phone && (
              <Pressable
                style={({ pressed }) => [styles.footerIconBtn, styles.footerCallBtn, pressed && { opacity: 0.8 }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(job.contact_phone!);
                  Alert.alert('Copied', `${job.contact_phone} copied to clipboard`);
                }}
                accessibilityRole="button"
                accessibilityLabel="Copy phone number"
              >
                <Ionicons name="call" size={20} color="#059669" />
              </Pressable>
            )}
            {job.contact_email && (
              <Pressable
                style={({ pressed }) => [styles.footerIconBtn, styles.footerEmailBtn, pressed && { opacity: 0.8 }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(job.contact_email!);
                  Alert.alert('Copied', `${job.contact_email} copied to clipboard`);
                }}
                accessibilityRole="button"
                accessibilityLabel="Copy email address"
              >
                <Ionicons name="mail" size={20} color="#2563EB" />
              </Pressable>
            )}

            {/* Apply button — takes remaining space */}
            <Pressable
              style={({ pressed }) => [
                styles.applyBtn,
                alreadyApplied && styles.appliedBtn,
                (pressed || applying) && { opacity: 0.8 },
              ]}
              onPress={handleApply}
              disabled={applying}
              accessibilityRole="button"
              accessibilityLabel={alreadyApplied ? 'View application details' : 'Apply to this job'}
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : alreadyApplied ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.applyBtnText}>Applied</Text>
                </View>
              ) : (
                <Text style={styles.applyBtnText}>Apply to this Job</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Photo Lightbox Modal ──────────────────────────── */}
      <Modal visible={lightboxVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.lightboxOverlay}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxVisible(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxIndex * SCREEN_WIDTH, y: 0 }}
          >
            {photos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.file_path }}
                style={{ width: SCREEN_WIDTH, height: '100%' }}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.lightboxCounter}>
              <Text style={styles.lightboxCounterText}>
                {lightboxIndex + 1} / {photos.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Contact Bottom Sheet ──────────────────────────── */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={sheetSnaps}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#fff', borderRadius: 20 }}
        handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          {hasContact ? (
            <>
              <Text style={styles.sheetTitle}>Contact {displayName} about this job</Text>

              <View style={styles.sheetCustomerRow}>
                {customer?.avatar_url ? (
                  <Image source={{ uri: customer.avatar_url }} style={styles.sheetAvatar} />
                ) : (
                  <View style={styles.sheetInitials}>
                    <Text style={styles.sheetInitialsText}>{initials}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.sheetCustomerName}>{displayName}</Text>
                  <Text style={styles.sheetCustomerSub}>{job.suburb}, {job.postcode}</Text>
                </View>
              </View>

              <View style={styles.sheetDivider} />

              {job.contact_phone && (
                <Pressable
                  style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.7 }]}
                  onPress={async () => {
                    await Clipboard.setStringAsync(job.contact_phone!);
                    Alert.alert('Copied', `${job.contact_phone} copied to clipboard`);
                  }}
                >
                  <View style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="call" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{job.contact_phone}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={18} color="#94A3B8" />
                </Pressable>
              )}

              {job.contact_email && (
                <Pressable
                  style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.7 }]}
                  onPress={async () => {
                    await Clipboard.setStringAsync(job.contact_email!);
                    Alert.alert('Copied', `${job.contact_email} copied to clipboard`);
                  }}
                >
                  <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="mail" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{job.contact_email}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={18} color="#94A3B8" />
                </Pressable>
              )}

              <View style={styles.sheetNote}>
                <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
                <Text style={styles.sheetNoteText}>Your interest has been sent to {displayName}. They'll be notified.</Text>
              </View>
            </>
          ) : (
            <View style={styles.sheetSuccessContent}>
              <View style={{ marginBottom: 4 }}>
                <Ionicons name="checkmark-circle" size={48} color="#0F6E56" />
              </View>
              <Text style={styles.sheetTitle}>Application Sent!</Text>
              <Text style={styles.sheetSuccessBody}>
                {displayName} has been notified and will be in touch if they'd like to proceed.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.sheetDoneBtn, pressed && { opacity: 0.8 }]}
                onPress={() => sheetRef.current?.close()}
              >
                <Text style={styles.sheetDoneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header — slim green bar */
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingLeft: 42,
  },
  headerTradePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  headerTradePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  headerUrgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerUrgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerSubText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },

  /* Cards */
  cardsContainer: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },

  /* Contact buttons — tap to copy */
  contactBtnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
  },
  contactBtnCall: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  contactBtnEmail: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  contactBtnLabel: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Fact chips */
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  /* Description divider */
  descriptionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },

  /* Posted-by inline (inside project card) */
  postedByInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  postedByAvatarTiny: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  postedByInitialsTiny: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postedByInitialsTinyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  postedByInlineText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  /* Section content */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#334155',
  },

  /* Photos */
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
    marginTop: 10,
  },
  photoDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  /* Documents */
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E1F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  docMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  /* Sticky footer — Apply + quick contact buttons */
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...Shadows.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  footerCallBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  footerEmailBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  applyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0F4F3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedBtn: {
    backgroundColor: '#0D9488',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  /* Lightbox */
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  lightboxCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Bottom sheet */
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  sheetCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  sheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  sheetInitials: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetInitialsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetCustomerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetCustomerSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  sheetNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
  },
  sheetNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  /* Success confirmation (no contact info) */
  sheetSuccessContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  sheetSuccessBody: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  sheetDoneBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F4F3E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  sheetDoneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Empty states */
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
});
