import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

const AVAILABILITY_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Limited', value: 'limited' },
  { label: 'Unavailable', value: 'unavailable' },
];

export default function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [availability, setAvailability] = useState('available');
  const [specialties, setSpecialties] = useState('');

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
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setWebsite(data.website ?? '');
      setSuburb(data.suburb ?? '');
      setPostcode(data.postcode ?? '');
      setAvailability(data.availability ?? 'available');
      setSpecialties(Array.isArray(data.specialties) ? data.specialties.join(', ') : '');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!profileId) return;

    if (!businessName.trim() || !phone.trim() || !suburb.trim() || !postcode.trim()) {
      Alert.alert('Missing fields', 'Business name, phone, suburb, and postcode are required.');
      return;
    }

    setSaving(true);

    const specialtiesArray = specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Re-geocode if location changed
    const geo = await geocode(`${suburb.trim()} ${postcode.trim()}`);

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
        availability,
        specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
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
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <ThemedText style={[styles.backText, { color: colors.tint }]}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Edit Profile</ThemedText>
          <View style={{ width: 50 }} />
        </View>

        {/* Business name */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Business Name</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Your business name"
            placeholderTextColor={colors.icon}
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Bio</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell customers about your work..."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Specialties */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Specialties</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={specialties}
            onChangeText={setSpecialties}
            placeholder="e.g. Heritage homes, Commercial fit-outs"
            placeholderTextColor={colors.icon}
          />
        </View>

        {/* Availability */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Availability</ThemedText>
          <View style={styles.chipRow}>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: availability === opt.value ? colors.tintLight : colors.surface,
                    borderColor: availability === opt.value ? colors.tint : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setAvailability(opt.value)}
              >
                <ThemedText
                  style={[styles.chipText, { color: availability === opt.value ? colors.tint : colors.text }]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Suburb</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={suburb}
            onChangeText={setSuburb}
            placeholder="e.g. Surry Hills"
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Postcode</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, width: 120 }]}
            value={postcode}
            onChangeText={setPostcode}
            placeholder="e.g. 2010"
            placeholderTextColor={colors.icon}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* Contact */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Phone</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="04xx xxx xxx"
            placeholderTextColor={colors.icon}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Email</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.icon}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Website</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={website}
            onChangeText={setWebsite}
            placeholder="www.yourbusiness.com.au"
            placeholderTextColor={colors.icon}
            autoCapitalize="none"
          />
        </View>

        {/* Save */}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.tint, opacity: saving ? 0.6 : 1 },
            pressed && !saving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing['2xl'],
    paddingBottom: Spacing['5xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  multiline: {
    minHeight: 110,
    height: undefined,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
