import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode } from '@/lib/geo';
import { uploadImage, uploadImages, isLocalUri } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 180;
const AVATAR_SIZE = 80;

// ─── Constants ───────────────────────────────────────────────────────────────

const AVAILABILITY_OPTIONS = [
  { label: 'Taking jobs now', value: 'available', icon: '🟢' },
  { label: 'Limited availability', value: 'limited', icon: '🟡' },
  { label: 'Unavailable', value: 'unavailable', icon: '🔴' },
];

const SPECIALTY_SUGGESTIONS = [
  'Knock Down Rebuild',
  'Granny Flats',
  'Second Storey Extensions',
  'Bathroom Renovations',
  'Kitchen Renovations',
  'Decks & Pergolas',
  'Custom Homes',
  'Heritage Restorations',
  'Commercial Fit-outs',
  'Roofing',
  'Landscaping',
  'Fencing',
  'Painting',
  'Tiling',
  'Concrete Work',
  'Retaining Walls',
];

const TEAM_SIZE_OPTIONS = ['Solo', '2-3 people', '4-5 people', '6-10 people', '10+ people'];

type ProjectDraft = {
  id: string;
  title: string;
  description: string;
  costRange: string;
  images: string[]; // URIs
};

type CredentialDraft = {
  id: string;
  name: string;
  type: 'licence' | 'insurance' | 'membership' | 'award' | 'other';
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
  const bgCanvas = colorScheme === 'dark' ? colors.background : '#fafaf8';
  const router = useRouter();

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

  // Specialties
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [customSpecialty, setCustomSpecialty] = useState('');

  // Projects
  const [projects, setProjects] = useState<ProjectDraft[]>([]);

  // Credentials / Documents
  const [credentials, setCredentials] = useState<CredentialDraft[]>([]);

  // ─── Fetch existing profile ──────────────────────────────────────────

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('builder_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
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
      setSpecialties(Array.isArray(data.specialties) ? data.specialties : []);

      // Extended fields (stored in profile_meta jsonb or separate columns)
      setEstablishedYear(data.established_year ? String(data.established_year) : '');
      setTeamSize(data.team_size ?? '');
      setAvailabilityNote(data.availability_note ?? '');
      setResponseTime(data.response_time ?? 'Within 2 hours');
      setAreasServiced(data.areas_serviced ?? '');
      setCoverPhoto(data.cover_photo_url ?? null);
      setProfilePhoto(data.profile_photo_url ?? null);

      // Projects & credentials from jsonb
      if (Array.isArray(data.projects)) setProjects(data.projects);
      if (Array.isArray(data.credentials)) setCredentials(data.credentials);
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

  // ─── Specialties management ──────────────────────────────────────────

  function toggleSpecialty(spec: string) {
    setSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec],
    );
  }

  function addCustomSpecialty() {
    const trimmed = customSpecialty.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties(prev => [...prev, trimmed]);
    }
    setCustomSpecialty('');
  }

  // ─── Projects management ─────────────────────────────────────────────

  function addProject() {
    setProjects(prev => [
      ...prev,
      { id: Date.now().toString(), title: '', description: '', costRange: '', images: [] },
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

  // ─── Save ────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!profileId) return;

    if (!businessName.trim() || !phone.trim() || !suburb.trim() || !postcode.trim()) {
      Alert.alert('Missing fields', 'Business name, phone, suburb, and postcode are required.');
      return;
    }

    setSaving(true);

    try {
      // Get user ID for storage paths
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
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

      // Project images — upload any local URIs
      const finalProjects = await Promise.all(
        projects.map(async (project) => {
          const localImages = project.images.filter(isLocalUri);
          const remoteImages = project.images.filter(uri => !isLocalUri(uri));

          if (localImages.length > 0) {
            const uploadedUrls = await uploadImages(localImages, userId, 'projects');
            return { ...project, images: [...remoteImages, ...uploadedUrls] };
          }
          return project;
        }),
      );

      // Update local state with uploaded URLs
      setProjects(finalProjects);

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
          specialties: specialties.length > 0 ? specialties : null,
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
        })
        .eq('id', profileId);

      setSaving(false);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setSaving(false);
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
        <ActivityIndicator color={teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgCanvas }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ─── Top bar ─── */}
        <View style={[styles.topBar, { backgroundColor: bgCanvas, borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.topBarBtn, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={teal} />
            ) : (
              <Text style={[styles.topBarBtn, { color: teal, fontWeight: '700' }]}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ═══════════════════════════════════════════════════════════════
              SECTION 1: COVER PHOTO & PROFILE PHOTO
              ═══════════════════════════════════════════════════════════════ */}
          <View style={styles.photosSection}>
            {/* Cover photo */}
            <Pressable
              onPress={() => pickImage(setCoverPhoto)}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              {coverPhoto ? (
                <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
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
              >
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatar} />
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

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 2: BUSINESS INFO
              ═══════════════════════════════════════════════════════════════ */}
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

            <FieldLabel label="Trade Category" colors={colors} />
            <View style={[styles.tradeDisplay, { backgroundColor: tealBg, borderColor: teal }]}>
              <Text style={[styles.tradeText, { color: teal }]}>
                {tradeCategory ? tradeCategory.charAt(0).toUpperCase() + tradeCategory.slice(1) : 'Not set'}
              </Text>
            </View>
            <Text style={[styles.fieldHint, { color: colors.icon }]}>
              Trade category is set during signup and cannot be changed here.
            </Text>

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
            />
            <Text style={[styles.fieldHint, { color: colors.icon }]}>
              This appears in your "About" section. Be descriptive — it helps customers trust you.
            </Text>

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

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 3: SPECIALTIES
              ═══════════════════════════════════════════════════════════════ */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader
              title="Specialties"
              colors={colors}
              subtitle="What are you best at? Tap to select, or add your own."
            />

            <View style={styles.chipWrap}>
              {SPECIALTY_SUGGESTIONS.map(spec => {
                const selected = specialties.includes(spec);
                return (
                  <Pressable
                    key={spec}
                    onPress={() => toggleSpecialty(spec)}
                    style={({ pressed }) => [
                      styles.specChip,
                      {
                        backgroundColor: selected ? tealBg : colors.background,
                        borderColor: selected ? teal : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {selected && <Text style={{ fontSize: 12, color: teal }}>✓</Text>}
                    <Text style={[styles.specChipText, { color: selected ? teal : colors.text }]}>
                      {spec}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Custom specialties the user added */}
              {specialties
                .filter(s => !SPECIALTY_SUGGESTIONS.includes(s))
                .map(spec => (
                  <Pressable
                    key={spec}
                    onPress={() => toggleSpecialty(spec)}
                    style={[styles.specChip, { backgroundColor: tealBg, borderColor: teal }]}
                  >
                    <Text style={{ fontSize: 12, color: teal }}>✓</Text>
                    <Text style={[styles.specChipText, { color: teal }]}>{spec}</Text>
                    <Text style={{ fontSize: 10, color: teal, marginLeft: 2 }}>✕</Text>
                  </Pressable>
                ))}
            </View>

            {/* Add custom */}
            <View style={[styles.addCustomRow, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.input, inputStyle(colors), { flex: 1 }]}
                value={customSpecialty}
                onChangeText={setCustomSpecialty}
                placeholder="Add a custom specialty..."
                placeholderTextColor={colors.icon}
                onSubmitEditing={addCustomSpecialty}
                returnKeyType="done"
              />
              <Pressable
                onPress={addCustomSpecialty}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: teal },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 4: CREDENTIALS & DOCUMENTS
              ═══════════════════════════════════════════════════════════════ */}
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
                  <Pressable onPress={() => removeCredential(cred.id)}>
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
                    >
                      <Text style={[styles.miniChipText, { color: cred.type === ct.value ? teal : colors.textSecondary }]}>
                        {ct.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            <Pressable
              onPress={addCredential}
              style={({ pressed }) => [
                styles.addCardBtn,
                { borderColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>+ Add Document</Text>
            </Pressable>
          </View>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 5: PROJECT GALLERY
              ═══════════════════════════════════════════════════════════════ */}
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
                  <Pressable onPress={() => removeProject(project.id)}>
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </Pressable>
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
                      <Image source={{ uri }} style={styles.projectImageFill} />
                      <Pressable
                        onPress={() => removeProjectImage(project.id, imgIdx)}
                        style={styles.removeImageBtn}
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
                  >
                    <Text style={{ fontSize: 24, color: colors.icon }}>+</Text>
                    <Text style={[styles.addImageText, { color: colors.icon }]}>Add photos</Text>
                  </Pressable>
                </ScrollView>
              </View>
            ))}

            <Pressable
              onPress={addProject}
              style={({ pressed }) => [
                styles.addCardBtn,
                { borderColor: teal },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ color: teal, fontWeight: '700', fontSize: 14 }}>+ Add Project</Text>
            </Pressable>
          </View>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 6: LOCATION & SERVICE AREA
              ═══════════════════════════════════════════════════════════════ */}
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

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 7: CONTACT INFO
              ═══════════════════════════════════════════════════════════════ */}
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

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 8: AVAILABILITY & RESPONSE
              ═══════════════════════════════════════════════════════════════ */}
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
                >
                  <Text style={[styles.miniChipText, { color: responseTime === opt ? teal : colors.textSecondary }]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── Save button (bottom) ─── */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: teal },
              (pressed || saving) && { opacity: 0.7 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  topBarBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: Spacing['5xl'],
  },

  // Photos section
  photosSection: {
    marginBottom: Spacing.lg,
  },
  coverImage: {
    width: '100%',
    height: COVER_HEIGHT,
    backgroundColor: '#e2e8f0',
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

  // Trade display
  tradeDisplay: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  tradeText: {
    fontSize: 15,
    fontWeight: '600',
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
  addCustomRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#e2e8f0',
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

  // Save button
  saveBtn: {
    marginHorizontal: Spacing.lg,
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
