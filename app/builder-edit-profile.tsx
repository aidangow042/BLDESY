import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { AppShell } from '@/components/layout';
import { useToast } from '@/components/ui';
import { Colors, Spacing, Radius, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode } from '@/lib/geo';
import { uploadImage, uploadImages, isLocalUri } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { VerifyCredentialsForm } from '@/components/builder/verify-credentials-form';
import { InsuranceSlots } from '@/components/builder/insurance-slots';
import { friendlyError } from '@/lib/error-messages';
import {
  TRADE_CATALOGUE,
  tradeDisplayName,
} from '@/components/builder/trade-catalogue';
import {
  getSpecialisationsForTrade,
  hasSpecialisations,
  sanitiseSpecialisations,
  type BuilderSpecialisations,
} from '@/lib/trade-specialisations';
import { requiresLicence, licenceCoversTrade } from '@/lib/licence-coverage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 180;
const AVATAR_SIZE = 80;

// ─── Constants ───────────────────────────────────────────────────────────────

const MEMBERSHIP_SUGGESTIONS = [
  'HIA (Housing Industry Association)',
  'MBA (Master Builders Association)',
  'Fair Trading Licensed',
  'Master Plumbers',
  'Master Electricians',
  'QBCC Licensed',
  'Registered Building Practitioner',
  'Certified Passive House',
];

const AWARD_SUGGESTIONS = [
  'HIA Award Winner',
  'MBA Award Winner',
  'Master Builder of the Year',
  'Best Renovation',
  'Best Custom Home',
  'Excellence in Sustainability',
];

const AVAILABILITY_OPTIONS = [
  { label: 'Taking jobs now', value: 'available', icon: '🟢' },
  { label: 'Limited availability', value: 'limited', icon: '🟡' },
  { label: 'Unavailable', value: 'unavailable', icon: '🔴' },
];

// State options for the inline "verify & add a licensed trade" flow. Mirrors
// the segmented states used in verify-credentials-form.tsx (verify-credentials
// currently supports NSW + QLD registers).
const ADD_TRADE_STATES = ['NSW', 'QLD'] as const;

const TEAM_SIZE_OPTIONS = ['Solo', '2-3 people', '4-5 people', '6-10 people', '10+ people'];

const STEP_LABELS = ['Photos & Info', 'Specialties', 'Portfolio', 'Location', 'Availability', 'Credentials'];

type ProjectDraft = {
  id: string;
  title: string;
  description: string;
  costRange: string;
  images: string[]; // URIs
  beforeImage?: string | null;
  afterImage?: string | null;
  videoUri?: string | null;
  testimonial?: { name: string; text: string } | null;
};

type CredentialDraft = {
  id: string;
  name: string;
  type: 'licence' | 'insurance' | 'membership' | 'award' | 'other';
  year?: string;
  coverType?: string;
  coverAmount?: string;
};

type TeamMemberDraft = {
  id: string;
  name: string;
  role: string;
  photoUri?: string | null;
};

type FAQDraft = {
  id: string;
  question: string;
  answer: string;
};

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, colors, subtitle }: { title: string; colors: any; subtitle?: string }) {
  return (
    <View style={secStyles.container}>
      <View style={secStyles.headerRow}>
        <Text style={[secStyles.title, { color: colors.text }]}>{title}</Text>
        <View style={[secStyles.line, { backgroundColor: colors.border }]} />
      </View>
      {subtitle && (
        <Text style={[secStyles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  line: { flex: 1, height: 1 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const teal = colors.teal;
  const tealDark = colors.tealDark;
  const tealBg = colors.tealBg;
  const bgCanvas = colors.canvas;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { userId } = useUser();
  const scrollRef = useRef<ScrollView>(null);

  // ─── Step management ─────────────────────────────────────────────────

  const [step, setStep] = useState(1);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dotWidths = useRef(
    STEP_LABELS.map((_, i) => new Animated.Value(i === 0 ? 24 : 8)),
  ).current;

  function animateToStep(from: number, to: number) {
    const direction = to > from ? -1 : 1;
    Animated.parallel([
      Animated.spring(dotWidths[from - 1], { toValue: 8, useNativeDriver: false, friction: 8 }),
      Animated.spring(dotWidths[to - 1], { toValue: 24, useNativeDriver: false, friction: 8 }),
    ]).start();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: direction * 300, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(to);
      slideAnim.setValue(-direction * 300);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }

  // ─── Loading / saving state ───────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // ─── Profile fields ──────────────────────────────────────────────────
  // Photos
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Basic info
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [tradeCategory, setTradeCategory] = useState('');

  // Trades — multi-trade. selectedTrades[0] is the primary trade. tradeCategory
  // (single) is still tracked for the legacy column + VerifyCredentialsForm prop.
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // Add-trade UI state
  const [tradePickerOpen, setTradePickerOpen] = useState(false);
  // When a picked trade needs a licence we don't yet hold, we stage it here and
  // show an inline verify form instead of adding immediately.
  const [pendingTrade, setPendingTrade] = useState<{ slug: string; name: string } | null>(null);
  const [pendingState, setPendingState] = useState<(typeof ADD_TRADE_STATES)[number]>('NSW');
  const [pendingLicenceNumber, setPendingLicenceNumber] = useState('');
  const [verifyingTrade, setVerifyingTrade] = useState(false);
  const [tradeVerifyError, setTradeVerifyError] = useState<string | null>(null);

  // Credentials
  const [abn, setAbn] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [teamSize, setTeamSize] = useState('');

  // Location
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radiusKm, setRadiusKm] = useState('25');
  const [areasServiced, setAreasServiced] = useState('');

  // Contact
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Availability
  const [availability, setAvailability] = useState('available');
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [responseTime, setResponseTime] = useState('Within 2 hours');

  // Specialisations — structured, per-trade sub-trade slugs.
  // Shape: { [tradeSlug]: string[] } (builder_profiles.specialisations JSONB).
  const [specialisations, setSpecialisations] = useState<BuilderSpecialisations>({});

  // Projects
  const [projects, setProjects] = useState<ProjectDraft[]>([]);

  // Credentials / Documents
  const [credentials, setCredentials] = useState<CredentialDraft[]>([]);
  const [credentialsVerified, setCredentialsVerified] = useState<any>(null);

  // Team Members
  const [teamMembers, setTeamMembers] = useState<TeamMemberDraft[]>([]);

  // FAQs
  const [faqs, setFaqs] = useState<FAQDraft[]>([]);

  // ─── Fetch existing profile ──────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
  }, [userId]);

  async function fetchProfile() {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('builder_profiles')
      .select('id, user_id, business_name, trade_category, trade_categories, suburb, postcode, bio, phone, email, website, profile_photo_url, cover_photo_url, projects, specialties, specialisations, credentials, credentials_verified, availability, availability_note, response_time, urgency_capacity, abn, license_key, latitude, longitude, radius_km')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfileId(data.id);
      setBusinessName(data.business_name ?? '');
      setBio(data.bio ?? '');
      setTradeCategory(data.trade_category ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setWebsite(data.website ?? '');
      setSuburb(data.suburb ?? '');
      setPostcode(data.postcode ?? '');
      setRadiusKm(String(data.radius_km ?? 25));
      setAvailability(data.availability ?? 'available');
      setAbn(data.abn ?? '');
      setLicenceNumber(data.license_key ?? '');

      // Multi-trade: prefer the array column; fall back to the single legacy
      // column so existing single-trade profiles keep working.
      const trades: string[] = Array.isArray(data.trade_categories) && data.trade_categories.length
        ? data.trade_categories.filter((t: unknown): t is string => typeof t === 'string')
        : (data.trade_category ? [data.trade_category] : []);
      setSelectedTrades(trades);

      // Structured specialisations, sanitised against the loaded trades (drops
      // any slugs for trades the builder no longer holds).
      setSpecialisations(sanitiseSpecialisations(data.specialisations, trades));

      // Extended fields (stored in profile_meta jsonb or separate columns)
      setEstablishedYear(data.established_year ? String(data.established_year) : '');
      setTeamSize(data.team_size ?? '');
      setAvailabilityNote(data.availability_note ?? '');
      setResponseTime(data.response_time ?? 'Within 2 hours');
      setAreasServiced(data.areas_serviced ?? '');
      setCoverPhoto(data.cover_photo_url ?? null);
      setProfilePhoto(data.profile_photo_url ?? null);

      // Projects, credentials, team members from jsonb
      if (Array.isArray(data.projects)) setProjects(data.projects);
      if (Array.isArray(data.credentials)) setCredentials(data.credentials);
      if (data.credentials_verified) setCredentialsVerified(data.credentials_verified);
      if (Array.isArray(data.team_members)) setTeamMembers(data.team_members);
      if (Array.isArray(data.faqs)) setFaqs(data.faqs);
    }
    setLoading(false);
  }

  // ─── Image picker ────────────────────────────────────────────────────

  async function pickImage(setter: (uri: string) => void) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  }

  // ─── Trade management (multi-trade) ──────────────────────────────────

  /** Verified licences the builder currently holds (from credentials_verified). */
  function heldLicences() {
    const list = credentialsVerified?.licences;
    return Array.isArray(list) ? list : [];
  }

  /** Make a non-primary trade the primary one by moving it to the front. */
  function makePrimaryTrade(slug: string) {
    setSelectedTrades(prev => {
      if (prev[0] === slug || !prev.includes(slug)) return prev;
      return [slug, ...prev.filter(t => t !== slug)];
    });
  }

  /** Remove a trade; block removing the last one. Also drops its specialisations. */
  function removeTrade(slug: string) {
    if (selectedTrades.length <= 1) {
      toast.show('You need at least one trade', { variant: 'warning' });
      return;
    }
    setSelectedTrades(prev => prev.filter(t => t !== slug));
    setSpecialisations(prev => {
      if (!(slug in prev)) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }

  /** Append a trade (assumes licence checks already passed) and close the picker. */
  function commitAddTrade(slug: string) {
    setSelectedTrades(prev => (prev.includes(slug) ? prev : [...prev, slug]));
    closeTradePicker();
  }

  function closeTradePicker() {
    setTradePickerOpen(false);
    setPendingTrade(null);
    setPendingLicenceNumber('');
    setPendingState('NSW');
    setTradeVerifyError(null);
  }

  /**
   * Decide how to add a trade picked from the catalogue:
   *  - no licence required → add now
   *  - already covered by a held/verified licence → add now (with a note)
   *  - otherwise → stage it and show the inline verify form
   */
  function handlePickTrade(slug: string, name: string) {
    if (selectedTrades.includes(slug)) return;
    setTradeVerifyError(null);

    if (!requiresLicence(slug) || licenceCoversTrade(slug, heldLicences())) {
      commitAddTrade(slug);
      return;
    }

    // Needs a licence we don't hold yet — stage for inline verification.
    setPendingTrade({ slug, name });
    setPendingLicenceNumber('');
    setPendingState('NSW');
  }

  /** Verify the staged trade's licence, then add it if verification succeeds. */
  async function verifyAndAddTrade() {
    if (!pendingTrade) return;
    const licence = pendingLicenceNumber.trim();
    if (!licence) {
      setTradeVerifyError('Enter your licence number to verify.');
      return;
    }

    setVerifyingTrade(true);
    setTradeVerifyError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTradeVerifyError('You must be signed in to verify a licence.');
        setVerifyingTrade(false);
        return;
      }

      const res = await supabase.functions.invoke('verify-credentials', {
        body: {
          licence_number: licence,
          state: pendingState,
          trade_category: pendingTrade.slug,
        },
      });

      if (res.error) {
        setTradeVerifyError(res.error.message || 'Verification failed — check the details and try again.');
        setVerifyingTrade(false);
        return;
      }

      // Re-fetch the profile's credentials_verified so coverage reflects the
      // freshly-verified licence (verify-credentials persists server-side).
      let latestCreds = res.data?.credentials_verified ?? null;
      if (profileId) {
        const { data: refetched } = await supabase
          .from('builder_profiles')
          .select('credentials_verified')
          .eq('id', profileId)
          .maybeSingle();
        if (refetched?.credentials_verified) latestCreds = refetched.credentials_verified;
      }
      if (latestCreds) setCredentialsVerified(latestCreds);

      const licenceList: any[] = Array.isArray(latestCreds?.licences) ? latestCreds.licences : [];
      const nowVerified =
        licenceList.some((l: any) => (l?.type ?? '').toLowerCase() === pendingTrade.slug && l?.verified) ||
        licenceCoversTrade(pendingTrade.slug, licenceList);

      if (nowVerified) {
        commitAddTrade(pendingTrade.slug);
      } else {
        setTradeVerifyError("Couldn't verify a licence for this trade. Check the number and state, then try again.");
      }
    } catch {
      setTradeVerifyError('Network error — check your connection and try again.');
    }

    setVerifyingTrade(false);
  }

  // ─── Specialisations management (structured, per-trade) ──────────────

  /** Toggle a specialisation slug for a given trade. Removes the trade key when emptied. */
  function toggleSpecialisation(trade: string, slug: string) {
    setSpecialisations(prev => {
      const current = prev[trade] ?? [];
      const has = current.includes(slug);
      const nextSlugs = has ? current.filter(s => s !== slug) : [...current, slug];
      const next = { ...prev };
      if (nextSlugs.length === 0) delete next[trade];
      else next[trade] = nextSlugs;
      return next;
    });
  }

  // ─── Projects management ─────────────────────────────────────────────

  function addProject() {
    setProjects(prev => [
      ...prev,
      { id: Date.now().toString(), title: '', description: '', costRange: '', images: [], beforeImage: null, afterImage: null, videoUri: null, testimonial: null },
    ]);
  }

  function updateProject(id: string, field: keyof ProjectDraft, value: any) {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function removeProject(id: string) {
    Alert.alert('Remove project?', 'This will delete this project from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setProjects(prev => prev.filter(p => p.id !== id)) },
    ]);
  }

  function moveProject(index: number, direction: 'up' | 'down') {
    setProjects(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function addProjectImage(projectId: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      updateProject(projectId, 'images', [
        ...(projects.find(p => p.id === projectId)?.images ?? []),
        ...newUris,
      ]);
    }
  }

  function removeProjectImage(projectId: string, imageIndex: number) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const updated = [...project.images];
    updated.splice(imageIndex, 1);
    updateProject(projectId, 'images', updated);
  }

  async function pickBeforeAfterImage(projectId: string, field: 'beforeImage' | 'afterImage') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateProject(projectId, field, result.assets[0].uri);
    }
  }

  async function pickProjectVideo(projectId: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateProject(projectId, 'videoUri', result.assets[0].uri);
    }
  }

  function updateTestimonial(projectId: string, field: 'name' | 'text', value: string) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const existing = p.testimonial ?? { name: '', text: '' };
      return { ...p, testimonial: { ...existing, [field]: value } };
    }));
  }

  function clearTestimonial(projectId: string) {
    updateProject(projectId, 'testimonial', null);
  }

  // ─── Credentials management ──────────────────────────────────────────

  function addCredential() {
    setCredentials(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', type: 'other' },
    ]);
  }

  function updateCredential(id: string, field: keyof CredentialDraft, value: any) {
    setCredentials(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function removeCredential(id: string) {
    setCredentials(prev => prev.filter(c => c.id !== id));
  }

  const CREDENTIAL_TYPES: { label: string; value: CredentialDraft['type'] }[] = [
    { label: '🛡️ Licence', value: 'licence' },
    { label: '📋 Insurance', value: 'insurance' },
    { label: '🏆 Membership', value: 'membership' },
    { label: '⭐ Award', value: 'award' },
    { label: '📄 Other', value: 'other' },
  ];

  // ─── Team Members management ───────────────────────────────────────────

  function addTeamMember() {
    setTeamMembers(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', role: '', photoUri: null },
    ]);
  }

  function updateTeamMember(id: string, field: keyof TeamMemberDraft, value: any) {
    setTeamMembers(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } : m)));
  }

  function removeTeamMember(id: string) {
    Alert.alert('Remove team member?', 'This person will be removed from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setTeamMembers(prev => prev.filter(m => m.id !== id)) },
    ]);
  }

  function moveTeamMember(index: number, direction: 'up' | 'down') {
    setTeamMembers(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function pickTeamMemberPhoto(memberId: string) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateTeamMember(memberId, 'photoUri', result.assets[0].uri);
    }
  }

  // ─── FAQ management ────────────────────────────────────────────────────

  function addFaq() {
    if (faqs.length >= 8) return;
    setFaqs(prev => [
      ...prev,
      { id: Date.now().toString(), question: '', answer: '' },
    ]);
  }

  function updateFaq(id: string, field: 'question' | 'answer', value: string) {
    setFaqs(prev => prev.map(f => (f.id === id ? { ...f, [field]: value } : f)));
  }

  function removeFaq(id: string) {
    Alert.alert('Remove FAQ?', 'This question will be removed from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setFaqs(prev => prev.filter(f => f.id !== id)) },
    ]);
  }

  function moveFaq(index: number, direction: 'up' | 'down') {
    setFaqs(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  // ─── Save ────────────────────────────────────────────────────────────

  function confirmPublish() {
    if (!profileId) return;
    if (!businessName.trim() || !phone.trim() || !suburb.trim() || !postcode.trim()) {
      Alert.alert('Missing fields', 'Business name, phone, suburb, and postcode are required.');
      return;
    }
    if (selectedTrades.length < 1) {
      Alert.alert('Add a trade', 'You need at least one trade before publishing.');
      return;
    }
    Alert.alert(
      'Publish Changes',
      'Your profile changes will be visible to customers. Publish now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: handleSave },
      ],
    );
  }

  async function handleSave() {
    if (!profileId) return;

    if (!businessName.trim() || !phone.trim() || !suburb.trim() || !postcode.trim()) {
      Alert.alert('Missing fields', 'Business name, phone, suburb, and postcode are required.');
      return;
    }

    if (selectedTrades.length < 1) {
      Alert.alert('Add a trade', 'You need at least one trade before saving.');
      return;
    }

    setSaving(true);

    try {
      if (!userId) {
        Alert.alert('Error', 'You must be signed in.');
        setSaving(false);
        return;
      }

      // ─── Upload images to Supabase Storage ───────────────────────
      // Cover photo
      let finalCoverUrl = coverPhoto;
      if (coverPhoto && isLocalUri(coverPhoto)) {
        const uploaded = await uploadImage(coverPhoto, userId, 'cover');
        if (uploaded) {
          finalCoverUrl = uploaded;
          setCoverPhoto(uploaded); // update local state to the remote URL
        } else {
          Alert.alert('Upload failed', 'Could not upload cover photo. Please try again.');
          setSaving(false);
          return;
        }
      }

      // Profile photo
      let finalProfileUrl = profilePhoto;
      if (profilePhoto && isLocalUri(profilePhoto)) {
        const uploaded = await uploadImage(profilePhoto, userId, 'profile');
        if (uploaded) {
          finalProfileUrl = uploaded;
          setProfilePhoto(uploaded);
        } else {
          Alert.alert('Upload failed', 'Could not upload profile photo. Please try again.');
          setSaving(false);
          return;
        }
      }

      // Project images, before/after, video — upload any local URIs
      const finalProjects = await Promise.all(
        projects.map(async (project) => {
          const localImages = project.images.filter(isLocalUri);
          const remoteImages = project.images.filter(uri => !isLocalUri(uri));
          let updated = { ...project };

          if (localImages.length > 0) {
            const uploadedUrls = await uploadImages(localImages, userId, 'projects');
            updated.images = [...remoteImages, ...uploadedUrls];
          }

          // Before image
          if (updated.beforeImage && isLocalUri(updated.beforeImage)) {
            const uploaded = await uploadImage(updated.beforeImage, userId, 'projects');
            updated.beforeImage = uploaded || null;
          }
          // After image
          if (updated.afterImage && isLocalUri(updated.afterImage)) {
            const uploaded = await uploadImage(updated.afterImage, userId, 'projects');
            updated.afterImage = uploaded || null;
          }
          // Video
          if (updated.videoUri && isLocalUri(updated.videoUri)) {
            const uploaded = await uploadImage(updated.videoUri, userId, 'projects');
            updated.videoUri = uploaded || null;
          }

          return updated;
        }),
      );

      // Update local state with uploaded URLs
      setProjects(finalProjects);

      // Team member photos — upload any local URIs. If an upload fails we
      // keep the local URI so the user can retry, and surface a single toast
      // at the end rather than silently dropping the photo from the record.
      let teamUploadFailures = 0;
      const finalTeamMembers = await Promise.all(
        teamMembers.map(async (member) => {
          if (member.photoUri && isLocalUri(member.photoUri)) {
            const uploaded = await uploadImage(member.photoUri, userId, 'team');
            if (uploaded) return { ...member, photoUri: uploaded };
            teamUploadFailures += 1;
            return member; // keep local URI so retry is possible
          }
          return member;
        }),
      );
      setTeamMembers(finalTeamMembers);
      if (teamUploadFailures > 0) {
        toast.show(
          `Couldn't upload ${teamUploadFailures} team photo${teamUploadFailures > 1 ? 's' : ''} — try again`,
          { variant: 'error', duration: 4000 },
        );
      }

      // ─── Re-geocode if location changed ──────────────────────────
      const geo = await geocode(`${suburb.trim()} ${postcode.trim()}`);

      // ─── Save to database ────────────────────────────────────────
      const { error } = await supabase
        .from('builder_profiles')
        .update({
          business_name: businessName.trim(),
          bio: bio.trim() || null,
          phone: phone.trim(),
          email: email.trim() || null,
          website: website.trim() || null,
          suburb: suburb.trim(),
          postcode: postcode.trim(),
          radius_km: parseInt(radiusKm, 10) || 25,
          availability,
          // Multi-trade: array column is source of truth; keep the single
          // legacy column in sync with the primary trade.
          trade_categories: selectedTrades,
          trade_category: selectedTrades[0] ?? null,
          // Structured sub-trade specialisations (replaces legacy `specialties`).
          specialisations: sanitiseSpecialisations(specialisations, selectedTrades),
          abn: abn.trim() || null,
          license_key: licenceNumber.trim() || null,
          latitude: geo?.latitude ?? null,
          longitude: geo?.longitude ?? null,
          // Extended fields
          established_year: establishedYear.trim() ? parseInt(establishedYear.trim(), 10) : null,
          team_size: teamSize || null,
          availability_note: availabilityNote.trim() || null,
          response_time: responseTime.trim() || null,
          areas_serviced: areasServiced.trim() || null,
          cover_photo_url: finalCoverUrl,
          profile_photo_url: finalProfileUrl,
          projects: finalProjects.length > 0 ? finalProjects : null,
          credentials: credentials.length > 0 ? credentials : null,
          team_members: finalTeamMembers.length > 0 ? finalTeamMembers : null,
          faqs: faqs.length > 0 ? faqs : null,
        })
        .eq('id', profileId);

      setSaving(false);

      if (error) {
        Alert.alert('Error', friendlyError(error));
        return;
      }

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', friendlyError(err));
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <ActivityIndicator color={teal} style={{ marginTop: 60 }} />
      </View>
    );
  }

  // ─── Progress bar ────────────────────────────────────────────────────

  function renderProgressBar() {
    return (
      <View style={styles.progressContainer}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isCompleted = step > stepNum;
          const isCurrent = step === stepNum;
          return (
            <View key={label} style={styles.progressStep}>
              <View style={styles.progressDotRow}>
                {i > 0 && (
                  <View
                    style={[
                      styles.progressLine,
                      { backgroundColor: isCompleted || isCurrent ? '#0F6E56' : colors.border },
                    ]}
                  />
                )}
                <Animated.View
                  style={[
                    styles.progressDot,
                    {
                      width: dotWidths[i],
                      backgroundColor: isCompleted
                        ? '#0F6E56'
                        : isCurrent
                          ? '#1D9E75'
                          : 'transparent',
                      borderColor: isCompleted || isCurrent ? '#0F6E56' : colors.border,
                    },
                  ]}
                >
                  {isCompleted && (
                    <MaterialIcons name="check" size={10} color="#fff" />
                  )}
                </Animated.View>
                {i < STEP_LABELS.length - 1 && (
                  <View
                    style={[
                      styles.progressLine,
                      { backgroundColor: isCompleted ? '#0F6E56' : colors.border },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: isCurrent ? '#0F6E56' : isCompleted ? colors.text : colors.textSecondary,
                    fontWeight: isCurrent ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  // ─── Completeness bar ────────────────────────────────────────────────

  function renderCompletenessBar() {
    const checks = [
      { label: 'Cover photo', done: !!coverPhoto },
      { label: 'Profile photo', done: !!profilePhoto },
      { label: 'Bio', done: bio.trim().length > 0 },
      { label: 'Phone', done: phone.trim().length > 0 },
      { label: 'Specialty', done: Object.values(specialisations).some(s => s.length > 0) },
      { label: 'Project', done: projects.length > 0 },
      { label: 'ABN', done: abn.trim().length > 0 },
      { label: 'Credential', done: credentials.length > 0 },
    ];
    const completed = checks.filter(c => c.done).length;
    const pct = Math.round((completed / checks.length) * 100);
    const missing = checks.filter(c => !c.done);
    if (pct >= 100) return null;
    return (
      <View style={[styles.completenessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.completenessTitle, { color: colors.text }]}>
            Profile {pct}% complete
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {completed}/{checks.length}
          </Text>
        </View>
        <View style={[styles.completenessBarBg, { backgroundColor: colors.border }]}>
          <View style={[styles.completenessBarFill, { width: `${pct}%`, backgroundColor: teal }]} />
        </View>
        {missing.length > 0 && (
          <View style={[styles.chipRow, { flexWrap: 'wrap', marginTop: 8 }]}>
            {missing.map(m => (
              <View key={m.label} style={[styles.missingChip, { backgroundColor: tealBg }]}>
                <Text style={{ fontSize: 11, color: teal, fontWeight: '600' }}>+ {m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ─── Trades editor (Step 1) ──────────────────────────────────────────

  function renderTradesEditor() {
    const held = heldLicences();
    return (
      <View>
        {/* Selected trade chips — first is Primary; each removable; tap a
            non-primary chip to promote it to primary. */}
        <View style={styles.chipWrap}>
          {selectedTrades.map((slug, idx) => {
            const isPrimary = idx === 0;
            return (
              <View
                key={slug}
                style={[
                  styles.tradeChip,
                  { backgroundColor: tealBg, borderColor: teal },
                ]}
              >
                {isPrimary && (
                  <View style={[styles.primaryBadge, { backgroundColor: teal }]}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => (isPrimary ? undefined : makePrimaryTrade(slug))}
                  disabled={isPrimary}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPrimary
                      ? `${tradeDisplayName(slug)} (primary trade)`
                      : `Make ${tradeDisplayName(slug)} your primary trade`
                  }
                  style={({ pressed }) => [pressed && !isPrimary && { opacity: 0.7 }]}
                >
                  <Text style={[styles.tradeChipText, { color: teal }]}>
                    {tradeDisplayName(slug)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeTrade(slug)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${tradeDisplayName(slug)}`}
                >
                  <Text style={{ fontSize: 12, color: teal, fontWeight: '700', marginLeft: 2 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}

          {/* Add trade toggle */}
          <Pressable
            onPress={() => (tradePickerOpen ? closeTradePicker() : setTradePickerOpen(true))}
            style={({ pressed }) => [
              styles.tradeChip,
              styles.addTradeChip,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={tradePickerOpen ? 'Close add trade' : 'Add trade'}
          >
            <Text style={[styles.tradeChipText, { color: teal }]}>
              {tradePickerOpen ? '× Close' : '+ Add trade'}
            </Text>
          </Pressable>
        </View>

        {selectedTrades.length > 1 && (
          <Text style={[styles.fieldHint, { color: colors.icon }]}>
            Your primary trade leads your profile. Tap another trade to make it primary.
          </Text>
        )}

        {/* Catalogue picker */}
        {tradePickerOpen && !pendingTrade && (
          <View style={[styles.tradePicker, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {TRADE_CATALOGUE.map(group => {
              const options = group.trades.filter(t => !selectedTrades.includes(t.slug));
              if (options.length === 0) return null;
              return (
                <View key={group.title} style={{ marginBottom: Spacing.md }}>
                  <Text style={[styles.tradeGroupLabel, { color: colors.textSecondary }]}>
                    {group.title.toUpperCase()}
                  </Text>
                  <View style={styles.chipWrap}>
                    {options.map(t => {
                      const needsLicence = requiresLicence(t.slug);
                      const covered = needsLicence && licenceCoversTrade(t.slug, held);
                      return (
                        <Pressable
                          key={t.slug}
                          onPress={() => handlePickTrade(t.slug, t.name)}
                          style={({ pressed }) => [
                            styles.specChip,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            pressed && { opacity: 0.7 },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${t.name}`}
                        >
                          {needsLicence && (
                            <MaterialIcons
                              name={covered ? 'verified' : 'lock-outline'}
                              size={13}
                              color={covered ? colors.success : colors.textSecondary}
                            />
                          )}
                          <Text style={[styles.specChipText, { color: colors.text }]}>{t.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Inline licence verify form for a staged licensed trade */}
        {pendingTrade && (
          <View style={[styles.tradePicker, { borderColor: teal, backgroundColor: colors.background }]}>
            <Text style={[styles.tradeChipText, { color: colors.text, marginBottom: 4 }]}>
              {pendingTrade.name} requires a licence
            </Text>
            <Text style={[styles.fieldHint, { color: colors.icon, marginTop: 0, marginBottom: Spacing.sm }]}>
              Verify a licence for this trade to add it to your profile.
            </Text>

            <FieldLabel label="State" colors={colors} />
            <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
              {ADD_TRADE_STATES.map(s => (
                <Pressable
                  key={s}
                  onPress={() => setPendingState(s)}
                  style={({ pressed }) => [
                    styles.miniChip,
                    {
                      backgroundColor: pendingState === s ? tealBg : colors.surface,
                      borderColor: pendingState === s ? teal : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={s}
                  accessibilityState={{ selected: pendingState === s }}
                >
                  <Text style={[styles.miniChipText, { color: pendingState === s ? teal : colors.textSecondary }]}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>

            <FieldLabel label="Licence Number" colors={colors} />
            <TextInput
              style={[styles.input, inputStyle(colors)]}
              value={pendingLicenceNumber}
              onChangeText={setPendingLicenceNumber}
              placeholder="Enter your licence number"
              placeholderTextColor={colors.icon}
              autoCapitalize="characters"
              editable={!verifyingTrade}
            />

            {tradeVerifyError && (
              <View style={[styles.tradeVerifyError, { backgroundColor: colors.errorLight }]}>
                <MaterialIcons name="error" size={16} color={colors.error} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.error }}>{tradeVerifyError}</Text>
              </View>
            )}

            <View style={[styles.row, { marginTop: Spacing.md }]}>
              <Pressable
                onPress={() => { setPendingTrade(null); setTradeVerifyError(null); }}
                disabled={verifyingTrade}
                style={({ pressed }) => [
                  styles.addCardBtn,
                  { flex: 1, marginTop: 0, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel adding trade"
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={verifyAndAddTrade}
                disabled={verifyingTrade}
                style={({ pressed }) => [
                  styles.addCardBtn,
                  { flex: 1, marginTop: 0, borderStyle: 'solid', backgroundColor: teal, borderColor: teal },
                  (pressed || verifyingTrade) && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Verify and add trade"
              >
                {verifyingTrade ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Verify & add</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  // ─── Step 1: Photos & Info ───────────────────────────────────────────

  function renderStep1() {
    return (
      <View style={styles.stepContent}>
        {renderCompletenessBar()}

        {/* Cover photo */}
        <View style={styles.photosSection}>
          <Pressable
            onPress={() => pickImage(setCoverPhoto)}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Change cover photo"
          >
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={[styles.coverImage, { backgroundColor: colors.border }]} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 28 }}>📷</Text>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  Add cover photo
                </Text>
                <Text style={[styles.placeholderHint, { color: colors.icon }]}>
                  Your best project photo — makes a great first impression
                </Text>
              </View>
            )}
            {coverPhoto && (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)']}
                style={styles.coverGradient}
              >
                <Text style={styles.coverEditText}>Tap to change cover</Text>
              </LinearGradient>
            )}
          </Pressable>

          {/* Profile photo */}
          <View style={styles.avatarRow}>
            <Pressable
              onPress={() => pickImage(setProfilePhoto)}
              style={({ pressed }) => [
                styles.avatarContainer,
                { borderColor: bgCanvas },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatar} cachePolicy="disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                  <Text style={{ fontSize: 28 }}>👤</Text>
                </View>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: teal }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✎</Text>
              </View>
            </Pressable>
            <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
              Profile photo
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Business Info"
            colors={colors}
            subtitle="The basics — your name, trade, and story"
          />

          <FieldLabel label="Business Name *" colors={colors} />
          <TextInput
            style={[styles.input, inputStyle(colors)]}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Your business name"
            placeholderTextColor={colors.icon}
          />

          <FieldLabel label="Trades *" colors={colors} />
          {renderTradesEditor()}

          <FieldLabel label="About / Bio" colors={colors} />
          <TextInput
            style={[styles.input, styles.multiline, inputStyle(colors)]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell customers about your experience, what makes you different, your approach to work..."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[styles.fieldHint, { color: colors.icon, flex: 1 }]}>
              This appears in your "About" section. Be descriptive — it helps customers trust you.
            </Text>
            <Text style={[styles.fieldHint, {
              color: bio.length >= 500 ? colors.error : bio.length >= 450 ? '#e67e22' : colors.icon,
              fontWeight: bio.length >= 450 ? '600' : '400',
            }]}>
              {bio.length}/500
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Established Year" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={establishedYear}
                onChangeText={setEstablishedYear}
                placeholder="e.g. 2012"
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Team Size" colors={colors} />
              <View style={styles.chipRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {TEAM_SIZE_OPTIONS.map(opt => (
                    <Pressable
                      key={opt}
                      onPress={() => setTeamSize(teamSize === opt ? '' : opt)}
                      style={({ pressed }) => [
                        styles.miniChip,
                        {
                          backgroundColor: teamSize === opt ? tealBg : colors.background,
                          borderColor: teamSize === opt ? teal : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={opt}
                      accessibilityState={{ selected: teamSize === opt }}
                    >
                      <Text style={[styles.miniChipText, { color: teamSize === opt ? teal : colors.textSecondary }]}>
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ─── Step 2: Specialties ─────────────────────────────────────────────

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Specialties"
            colors={colors}
            subtitle="Tap the sub-trades you offer for each of your trades."
          />

          {(() => {
            const tradesWithSpecs = selectedTrades.filter(hasSpecialisations);
            if (tradesWithSpecs.length === 0) {
              return (
                <Text style={[styles.fieldHint, { color: colors.icon, marginTop: 0 }]}>
                  {selectedTrades.length === 0
                    ? 'Add a trade in step 1 to choose specialties.'
                    : "Your selected trades don't have specialties to choose from."}
                </Text>
              );
            }
            return tradesWithSpecs.map((trade, idx) => {
              const options = getSpecialisationsForTrade(trade);
              const chosen = specialisations[trade] ?? [];
              return (
                <View key={trade} style={idx > 0 ? { marginTop: Spacing.lg } : undefined}>
                  <Text style={[styles.tradeGroupLabel, { color: colors.textSecondary }]}>
                    {tradeDisplayName(trade).toUpperCase()}
                  </Text>
                  <View style={styles.chipWrap}>
                    {options.map(spec => {
                      const selected = chosen.includes(spec.slug);
                      return (
                        <Pressable
                          key={spec.slug}
                          onPress={() => toggleSpecialisation(trade, spec.slug)}
                          style={({ pressed }) => [
                            styles.specChip,
                            {
                              backgroundColor: selected ? tealBg : colors.background,
                              borderColor: selected ? teal : colors.border,
                            },
                            pressed && { opacity: 0.7 },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${spec.name}${selected ? ', selected' : ''}`}
                          accessibilityState={{ selected }}
                        >
                          {selected && <Text style={{ fontSize: 12, color: teal }}>✓</Text>}
                          <Text style={[styles.specChipText, { color: selected ? teal : colors.text }]}>
                            {spec.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            });
          })()}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Credentials & Documents"
            colors={colors}
            subtitle="Licences, insurance, memberships — builds trust with customers"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FieldLabel label="ABN" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={abn}
                onChangeText={setAbn}
                placeholder="11 222 333 444"
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Licence Number" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={licenceNumber}
                onChangeText={setLicenceNumber}
                placeholder="e.g. BLD-12345"
                placeholderTextColor={colors.icon}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Credential cards */}
          {credentials.map((cred, idx) => (
            <View key={cred.id} style={[styles.credCard, { borderColor: colors.border }]}>
              <View style={styles.credCardHeader}>
                <Text style={[styles.credCardNum, { color: colors.textSecondary }]}>
                  Document {idx + 1}
                </Text>
                <Pressable onPress={() => removeCredential(cred.id)} accessibilityRole="button" accessibilityLabel="Remove document">
                  <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                </Pressable>
              </View>

              <FieldLabel label="Document Name" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={cred.name}
                onChangeText={v => updateCredential(cred.id, 'name', v)}
                placeholder="e.g. Public Liability Insurance"
                placeholderTextColor={colors.icon}
              />

              <FieldLabel label="Type" colors={colors} />
              <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
                {CREDENTIAL_TYPES.map(ct => (
                  <Pressable
                    key={ct.value}
                    onPress={() => updateCredential(cred.id, 'type', ct.value)}
                    style={({ pressed }) => [
                      styles.miniChip,
                      {
                        backgroundColor: cred.type === ct.value ? tealBg : colors.background,
                        borderColor: cred.type === ct.value ? teal : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={ct.label}
                    accessibilityState={{ selected: cred.type === ct.value }}
                  >
                    <Text style={[styles.miniChipText, { color: cred.type === ct.value ? teal : colors.textSecondary }]}>
                      {ct.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Predefined picker for memberships */}
              {cred.type === 'membership' && (
                <>
                  <FieldLabel label="Select or type a name" colors={colors} />
                  <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
                    {MEMBERSHIP_SUGGESTIONS.map(s => (
                      <Pressable
                        key={s}
                        onPress={() => updateCredential(cred.id, 'name', s)}
                        style={({ pressed }) => [
                          styles.miniChip,
                          {
                            backgroundColor: cred.name === s ? tealBg : colors.background,
                            borderColor: cred.name === s ? teal : colors.border,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                      >
                        <Text style={[styles.miniChipText, { color: cred.name === s ? teal : colors.textSecondary }]}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Predefined picker for awards */}
              {cred.type === 'award' && (
                <>
                  <FieldLabel label="Select or type a name" colors={colors} />
                  <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
                    {AWARD_SUGGESTIONS.map(s => (
                      <Pressable
                        key={s}
                        onPress={() => updateCredential(cred.id, 'name', s)}
                        style={({ pressed }) => [
                          styles.miniChip,
                          {
                            backgroundColor: cred.name === s ? tealBg : colors.background,
                            borderColor: cred.name === s ? teal : colors.border,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                      >
                        <Text style={[styles.miniChipText, { color: cred.name === s ? teal : colors.textSecondary }]}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Year field for memberships and awards */}
              {(cred.type === 'membership' || cred.type === 'award') && (
                <View style={{ marginTop: 4 }}>
                  <FieldLabel label="Year" colors={colors} />
                  <TextInput
                    style={[styles.input, inputStyle(colors), { width: 100 }]}
                    value={cred.year ?? ''}
                    onChangeText={v => updateCredential(cred.id, 'year', v)}
                    placeholder="e.g. 2024"
                    placeholderTextColor={colors.icon}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              )}

              {/* Insurance detail fields */}
              {cred.type === 'insurance' && (
                <>
                  <FieldLabel label="Cover Type" colors={colors} />
                  <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
                    {['Public Liability', 'Home Warranty', 'Workers Comp', 'Professional Indemnity'].map(ct => (
                      <Pressable
                        key={ct}
                        onPress={() => updateCredential(cred.id, 'coverType', ct)}
                        style={({ pressed }) => [
                          styles.miniChip,
                          {
                            backgroundColor: cred.coverType === ct ? tealBg : colors.background,
                            borderColor: cred.coverType === ct ? teal : colors.border,
                          },
                          pressed && { opacity: 0.7 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={ct}
                      >
                        <Text style={[styles.miniChipText, { color: cred.coverType === ct ? teal : colors.textSecondary }]}>
                          {ct}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <FieldLabel label="Cover Amount" colors={colors} />
                  <TextInput
                    style={[styles.input, inputStyle(colors), { width: 140 }]}
                    value={cred.coverAmount ?? ''}
                    onChangeText={v => updateCredential(cred.id, 'coverAmount', v)}
                    placeholder="e.g. $20M"
                    placeholderTextColor={colors.icon}
                  />
                </>
              )}
            </View>
          ))}

          <Pressable
            onPress={addCredential}
            style={({ pressed }) => [
              styles.addCardBtn,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add document"
          >
            <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>+ Add Document</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Step 3: Portfolio ───────────────────────────────────────────────

  function renderStep3() {
    return (
      <View style={styles.stepContent}>
        {/* Projects */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Projects / Our Work"
            colors={colors}
            subtitle="Showcase your best work with photos, descriptions, and costs"
          />

          {projects.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 32 }}>🏗️</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No projects yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add your first project to showcase your work and attract customers.
              </Text>
            </View>
          )}

          {projects.map((project, idx) => (
            <View key={project.id} style={[styles.projectCard, { borderColor: colors.border }]}>
              <View style={styles.credCardHeader}>
                <Text style={[styles.projectNum, { color: teal }]}>
                  Project {idx + 1}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {idx > 0 && (
                    <Pressable onPress={() => moveProject(idx, 'up')} accessibilityRole="button" accessibilityLabel="Move project up">
                      <Text style={{ color: teal, fontSize: 18 }}>↑</Text>
                    </Pressable>
                  )}
                  {idx < projects.length - 1 && (
                    <Pressable onPress={() => moveProject(idx, 'down')} accessibilityRole="button" accessibilityLabel="Move project down">
                      <Text style={{ color: teal, fontSize: 18 }}>↓</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => removeProject(project.id)} accessibilityRole="button" accessibilityLabel="Remove project">
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
              </View>

              <FieldLabel label="Project Title *" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={project.title}
                onChangeText={v => updateProject(project.id, 'title', v)}
                placeholder="e.g. Merewether Kitchen Renovation"
                placeholderTextColor={colors.icon}
              />

              <FieldLabel label="Description" colors={colors} />
              <TextInput
                style={[styles.input, styles.multilineSmall, inputStyle(colors)]}
                value={project.description}
                onChangeText={v => updateProject(project.id, 'description', v)}
                placeholder="Describe the scope of work, materials used, etc."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <FieldLabel label="Cost Range (optional)" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={project.costRange}
                onChangeText={v => updateProject(project.id, 'costRange', v)}
                placeholder="e.g. $45k – $60k"
                placeholderTextColor={colors.icon}
              />

              {/* Project images */}
              <FieldLabel label="Photos" colors={colors} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
                {project.images.map((uri, imgIdx) => (
                  <View key={imgIdx} style={styles.projectImageThumb}>
                    <Image source={{ uri }} style={[styles.projectImageFill, { backgroundColor: colors.border }]} cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
                    <Pressable
                      onPress={() => removeProjectImage(project.id, imgIdx)}
                      style={styles.removeImageBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => addProjectImage(project.id)}
                  style={({ pressed }) => [
                    styles.addImageBtn,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos"
                >
                  <Text style={{ fontSize: 24, color: colors.icon }}>+</Text>
                  <Text style={[styles.addImageText, { color: colors.icon }]}>Add photos</Text>
                </Pressable>
              </ScrollView>

              {/* Before / After images */}
              <FieldLabel label="Before & After (optional)" colors={colors} />
              <Text style={[styles.fieldHint, { color: colors.icon, marginTop: -2, marginBottom: 8 }]}>
                Add a before and after photo to show the transformation
              </Text>
              <View style={styles.beforeAfterRow}>
                <Pressable
                  onPress={() => pickBeforeAfterImage(project.id, 'beforeImage')}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add before photo"
                >
                  {project.beforeImage ? (
                    <View style={styles.baThumb}>
                      <Image source={{ uri: project.beforeImage }} style={[styles.projectImageFill, { backgroundColor: colors.border }]} cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
                      <View style={[styles.baLabel, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <Text style={styles.baLabelText}>BEFORE</Text>
                      </View>
                      <Pressable
                        onPress={() => updateProject(project.id, 'beforeImage', null)}
                        style={styles.removeImageBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Remove before photo"
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[styles.baPlaceholder, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={{ fontSize: 20, color: colors.icon }}>+</Text>
                      <Text style={[styles.addImageText, { color: colors.icon }]}>Before</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => pickBeforeAfterImage(project.id, 'afterImage')}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add after photo"
                >
                  {project.afterImage ? (
                    <View style={styles.baThumb}>
                      <Image source={{ uri: project.afterImage }} style={[styles.projectImageFill, { backgroundColor: colors.border }]} cachePolicy="disk" placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }} />
                      <View style={[styles.baLabel, { backgroundColor: teal }]}>
                        <Text style={styles.baLabelText}>AFTER</Text>
                      </View>
                      <Pressable
                        onPress={() => updateProject(project.id, 'afterImage', null)}
                        style={styles.removeImageBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Remove after photo"
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[styles.baPlaceholder, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={{ fontSize: 20, color: colors.icon }}>+</Text>
                      <Text style={[styles.addImageText, { color: colors.icon }]}>After</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Video */}
              <FieldLabel label="Video (optional)" colors={colors} />
              {project.videoUri ? (
                <View style={[styles.videoRow, { borderColor: colors.border }]}>
                  <Text style={[{ flex: 1, fontSize: 13, color: colors.text }]} numberOfLines={1}>
                    Video attached
                  </Text>
                  <Pressable onPress={() => updateProject(project.id, 'videoUri', null)} accessibilityRole="button" accessibilityLabel="Remove video">
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => pickProjectVideo(project.id)}
                  style={({ pressed }) => [
                    styles.addCardBtn,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add video"
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>+ Add Video</Text>
                </Pressable>
              )}

              {/* Testimonial */}
              <FieldLabel label="Client Testimonial (optional)" colors={colors} />
              {project.testimonial ? (
                <View style={[styles.testimonialBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={styles.credCardHeader}>
                    <Text style={[styles.credCardNum, { color: colors.textSecondary }]}>Testimonial</Text>
                    <Pressable onPress={() => clearTestimonial(project.id)} accessibilityRole="button" accessibilityLabel="Remove testimonial">
                      <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    style={[styles.input, inputStyle(colors), { marginTop: 6 }]}
                    value={project.testimonial.name}
                    onChangeText={v => updateTestimonial(project.id, 'name', v)}
                    placeholder="Client first name"
                    placeholderTextColor={colors.icon}
                  />
                  <TextInput
                    style={[styles.input, styles.multilineSmall, inputStyle(colors), { marginTop: 8 }]}
                    value={project.testimonial.text}
                    onChangeText={v => updateTestimonial(project.id, 'text', v)}
                    placeholder="What did the client say about this project?"
                    placeholderTextColor={colors.icon}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => updateProject(project.id, 'testimonial', { name: '', text: '' })}
                  style={({ pressed }) => [
                    styles.addCardBtn,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add testimonial"
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>+ Add Testimonial</Text>
                </Pressable>
              )}
            </View>
          ))}

          <Pressable
            onPress={addProject}
            style={({ pressed }) => [
              styles.addCardBtn,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add project"
          >
            <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>+ Add Project</Text>
          </Pressable>
        </View>

        {/* Team Members */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Team Members"
            colors={colors}
            subtitle="Introduce your team — helps customers feel connected"
          />

          {teamMembers.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 32 }}>👥</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No team members yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add your team to show customers who they'll be working with.
              </Text>
            </View>
          )}

          {teamMembers.map((member, idx) => (
            <View key={member.id} style={[styles.credCard, { borderColor: colors.border }]}>
              <View style={styles.credCardHeader}>
                <Text style={[styles.credCardNum, { color: colors.textSecondary }]}>
                  Member {idx + 1}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {idx > 0 && (
                    <Pressable onPress={() => moveTeamMember(idx, 'up')} accessibilityRole="button" accessibilityLabel="Move member up">
                      <Text style={{ color: teal, fontSize: 18 }}>↑</Text>
                    </Pressable>
                  )}
                  {idx < teamMembers.length - 1 && (
                    <Pressable onPress={() => moveTeamMember(idx, 'down')} accessibilityRole="button" accessibilityLabel="Move member down">
                      <Text style={{ color: teal, fontSize: 18 }}>↓</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => removeTeamMember(member.id)} accessibilityRole="button" accessibilityLabel="Remove team member">
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                {/* Photo */}
                <Pressable
                  onPress={() => pickTeamMemberPhoto(member.id)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add team member photo"
                >
                  {member.photoUri ? (
                    <Image
                      source={{ uri: member.photoUri }}
                      style={[styles.teamMemberPhoto, { backgroundColor: colors.border }]}
                      cachePolicy="disk"
                      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                    />
                  ) : (
                    <View style={[styles.teamMemberPhotoPlaceholder, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={{ fontSize: 20, color: colors.icon }}>+</Text>
                      <Text style={{ fontSize: 9, color: colors.icon, fontWeight: '600' }}>Photo</Text>
                    </View>
                  )}
                </Pressable>

                {/* Name + Role */}
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, inputStyle(colors)]}
                    value={member.name}
                    onChangeText={v => updateTeamMember(member.id, 'name', v)}
                    placeholder="Name"
                    placeholderTextColor={colors.icon}
                  />
                  <TextInput
                    style={[styles.input, inputStyle(colors), { marginTop: 8 }]}
                    value={member.role}
                    onChangeText={v => updateTeamMember(member.id, 'role', v)}
                    placeholder="Role (e.g. Lead Carpenter)"
                    placeholderTextColor={colors.icon}
                  />
                </View>
              </View>
            </View>
          ))}

          <Pressable
            onPress={addTeamMember}
            style={({ pressed }) => [
              styles.addCardBtn,
              { borderColor: teal },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add team member"
          >
            <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>+ Add Team Member</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Step 4: Location ────────────────────────────────────────────────

  function renderStep4() {
    return (
      <View style={styles.stepContent}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Location & Service Area"
            colors={colors}
            subtitle="Where you're based and how far you'll travel"
          />

          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <FieldLabel label="Suburb *" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={suburb}
                onChangeText={setSuburb}
                placeholder="e.g. Newcastle"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel label="Postcode *" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={postcode}
                onChangeText={setPostcode}
                placeholder="2300"
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <FieldLabel label="Service Radius (km)" colors={colors} />
          <View style={styles.radiusRow}>
            <TextInput
              style={[styles.input, inputStyle(colors), { width: 80 }]}
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.radiusHint, { color: colors.textSecondary }]}>
              km from {suburb || 'your suburb'}
            </Text>
          </View>

          <FieldLabel label="Areas Serviced" colors={colors} />
          <TextInput
            style={[styles.input, inputStyle(colors)]}
            value={areasServiced}
            onChangeText={setAreasServiced}
            placeholder="e.g. Newcastle, Hunter Valley, Lake Macquarie"
            placeholderTextColor={colors.icon}
          />
          <Text style={[styles.fieldHint, { color: colors.icon }]}>
            Comma-separated list shown on your profile
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Contact Info"
            colors={colors}
            subtitle="How customers can reach you"
          />

          <FieldLabel label="Phone *" colors={colors} />
          <TextInput
            style={[styles.input, inputStyle(colors)]}
            value={phone}
            onChangeText={setPhone}
            placeholder="04xx xxx xxx"
            placeholderTextColor={colors.icon}
            keyboardType="phone-pad"
          />

          <FieldLabel label="Email" colors={colors} />
          <TextInput
            style={[styles.input, inputStyle(colors)]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.icon}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FieldLabel label="Website" colors={colors} />
          <TextInput
            style={[styles.input, inputStyle(colors)]}
            value={website}
            onChangeText={setWebsite}
            placeholder="www.yourbusiness.com.au"
            placeholderTextColor={colors.icon}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      </View>
    );
  }

  // ─── Step 5: Availability ────────────────────────────────────────────

  function renderStep5() {
    return (
      <View style={styles.stepContent}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Availability & Response"
            colors={colors}
            subtitle="Let customers know when you're free and how fast you reply"
          />

          <FieldLabel label="Status" colors={colors} />
          {AVAILABILITY_OPTIONS.map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => setAvailability(opt.value)}
              style={({ pressed }) => [
                styles.availOption,
                {
                  backgroundColor: availability === opt.value ? tealBg : colors.background,
                  borderColor: availability === opt.value ? teal : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="radio"
              accessibilityLabel={opt.label}
              accessibilityState={{ checked: availability === opt.value }}
            >
              <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
              <Text style={[
                styles.availLabel,
                { color: availability === opt.value ? teal : colors.text },
              ]}>
                {opt.label}
              </Text>
              {availability === opt.value && (
                <Text style={{ color: teal, fontWeight: '700', marginLeft: 'auto' }}>✓</Text>
              )}
            </Pressable>
          ))}

          <FieldLabel label="Availability Note (optional)" colors={colors} />
          <TextInput
            style={[styles.input, inputStyle(colors)]}
            value={availabilityNote}
            onChangeText={setAvailabilityNote}
            placeholder="e.g. Available from April 2026"
            placeholderTextColor={colors.icon}
          />

          <FieldLabel label="Typical Response Time" colors={colors} />
          <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
            {['Within 1 hour', 'Within 2 hours', 'Within 4 hours', 'Same day', 'Within 24 hours'].map(opt => (
              <Pressable
                key={opt}
                onPress={() => setResponseTime(opt)}
                style={({ pressed }) => [
                  styles.miniChip,
                  {
                    backgroundColor: responseTime === opt ? tealBg : colors.background,
                    borderColor: responseTime === opt ? teal : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="radio"
                accessibilityLabel={opt}
                accessibilityState={{ checked: responseTime === opt }}
              >
                <Text style={[styles.miniChipText, { color: responseTime === opt ? teal : colors.textSecondary }]}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader
            title="Frequently Asked Questions"
            colors={colors}
            subtitle="Answer common questions upfront — saves you time later"
          />

          {faqs.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ fontSize: 32 }}>❓</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No FAQs yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add answers to questions customers commonly ask you.
              </Text>
            </View>
          )}

          {faqs.map((faq, idx) => (
            <View key={faq.id} style={[styles.credCard, { borderColor: colors.border }]}>
              <View style={styles.credCardHeader}>
                <Text style={[styles.credCardNum, { color: colors.textSecondary }]}>
                  FAQ {idx + 1}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {idx > 0 && (
                    <Pressable onPress={() => moveFaq(idx, 'up')} accessibilityRole="button" accessibilityLabel="Move FAQ up">
                      <Text style={{ color: teal, fontSize: 18 }}>↑</Text>
                    </Pressable>
                  )}
                  {idx < faqs.length - 1 && (
                    <Pressable onPress={() => moveFaq(idx, 'down')} accessibilityRole="button" accessibilityLabel="Move FAQ down">
                      <Text style={{ color: teal, fontSize: 18 }}>↓</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => removeFaq(faq.id)} accessibilityRole="button" accessibilityLabel="Remove FAQ">
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
                </View>
              </View>

              <FieldLabel label="Question" colors={colors} />
              <TextInput
                style={[styles.input, inputStyle(colors)]}
                value={faq.question}
                onChangeText={v => updateFaq(faq.id, 'question', v)}
                placeholder="e.g. How long does a typical renovation take?"
                placeholderTextColor={colors.icon}
              />

              <FieldLabel label="Answer" colors={colors} />
              <TextInput
                style={[styles.input, styles.multilineSmall, inputStyle(colors)]}
                value={faq.answer}
                onChangeText={v => updateFaq(faq.id, 'answer', v)}
                placeholder="Your answer..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          ))}

          <Pressable
            onPress={addFaq}
            disabled={faqs.length >= 8}
            style={({ pressed }) => [
              styles.addCardBtn,
              { borderColor: faqs.length >= 8 ? colors.border : teal },
              (pressed || faqs.length >= 8) && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add FAQ"
          >
            <Text style={{ color: faqs.length >= 8 ? colors.textSecondary : teal, fontWeight: '700', fontSize: 14 }}>
              {faqs.length >= 8 ? 'Maximum 8 FAQs reached' : '+ Add FAQ'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────

  return (
    <AppShell
      title={`Edit Profile · ${step}/${STEP_LABELS.length}`}
      showBack
      onBackPress={() => (step > 1 ? animateToStep(step, step - 1) : router.back())}
      background={bgCanvas}
    >

      {/* Progress dots */}
      {renderProgressBar()}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: fadeAnim }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && (
              <View style={[styles.stepContent, { paddingHorizontal: Spacing.lg, gap: Spacing['2xl'] }]}>
                <VerifyCredentialsForm
                  tradeCategory={selectedTrades[0] ?? tradeCategory}
                  existingCredentials={credentialsVerified}
                  onVerified={(creds) => setCredentialsVerified(creds)}
                />
                <View style={{ gap: Spacing.md }}>
                  <Text style={[Type.h2, { color: colors.text }]}>Insurance</Text>
                  <Text style={[Type.caption, { color: colors.textSecondary }]}>
                    Upload your Certificate of Currency for each policy. Our AI extracts insurer, coverage and expiry, then verifies it against known providers.
                  </Text>
                  <InsuranceSlots
                    credentials={credentialsVerified}
                    abnEntityName={credentialsVerified?.abn?.entity_name ?? null}
                    profileType="builder"
                    onUpdated={(merged) => setCredentialsVerified(merged)}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: bgCanvas }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.draftBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Save draft"
        >
          {saving ? (
            <ActivityIndicator size="small" color={teal} />
          ) : (
            <Text style={[styles.draftBtnText, { color: teal }]}>Save Draft</Text>
          )}
        </Pressable>

        {step < 6 ? (
          <Pressable
            onPress={() => animateToStep(step, step + 1)}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <LinearGradient
              colors={['#0d9488', '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={confirmPublish}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryBtn,
              saving && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Publish changes"
          >
            <LinearGradient
              colors={saving ? ['#9CA3AF', '#9CA3AF'] : ['#0d9488', '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="publish" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Publish Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </AppShell>
  );
}

// ─── Field Label sub-component ───────────────────────────────────────────────

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
  );
}

// ─── Input style helper ──────────────────────────────────────────────────────

function inputStyle(colors: any) {
  return {
    color: colors.text,
    backgroundColor: colors.background,
    borderColor: colors.border,
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerStepText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Progress */
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 0,
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  progressDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressDot: {
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
  },
  progressLabel: {
    fontSize: 9,
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  /* Scroll / step content */
  scrollContent: {
    paddingBottom: 24,
  },
  stepContent: {
    gap: 0,
    paddingTop: 4,
  },

  // Photos section
  photosSection: {
    marginBottom: Spacing.lg,
  },
  coverImage: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  coverPlaceholder: {
    width: '100%',
    height: COVER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  coverEditText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderHint: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Spacing.lg,
    marginTop: -(AVATAR_SIZE / 2),
  },
  avatarContainer: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 3,
    overflow: 'visible',
    ...Shadows.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: AVATAR_SIZE / 2,
  },

  // Cards
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },

  // Fields
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  multiline: {
    minHeight: 120,
    height: undefined,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  multilineSmall: {
    minHeight: 80,
    height: undefined,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  // Trades editor (multi-trade)
  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tradeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addTradeChip: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  primaryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tradePicker: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  tradeGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tradeVerifyError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Specialties
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  specChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Credentials
  credCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  credCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  credCardNum: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCardBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },

  // Projects
  projectCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  projectNum: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  imageRow: {
    gap: 8,
    paddingVertical: 4,
  },
  projectImageThumb: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  projectImageFill: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addImageText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Team members
  teamMemberPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  teamMemberPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },

  // Before/After
  beforeAfterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  baThumb: {
    width: 130,
    height: 100,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  baPlaceholder: {
    width: 130,
    height: 100,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  baLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: 'center',
  },
  baLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Video
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 10,
  },

  // Testimonial
  testimonialBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
  },

  // Availability
  availOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 6,
  },
  availLabel: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Location
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radiusHint: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Completeness
  completenessCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  completenessTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  completenessBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  completenessBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  missingChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  draftBtn: {
    minWidth: 80,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  primaryBtnGrad: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
