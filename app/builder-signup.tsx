import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
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

const TRADE_CATEGORIES = [
  'Builder',
  'Plumber',
  'Electrician',
  'Carpenter',
  'Painter',
  'Roofer',
  'Landscaper',
  'Tiler',
  'Concreter',
  'Fencer',
  'Plasterer',
  'Bricklayer',
  'Handyman',
  'Other',
];

const URGENCY_OPTIONS = ['Emergency', 'Soon', 'Planned'];

export default function BuilderSignupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step transition animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Dot width animations
  const dotWidths = useRef([1, 2, 3].map((s) => new Animated.Value(s === 1 ? 24 : 8))).current;

  function animateToStep(from: number, to: number) {
    const direction = to > from ? -1 : 1; // slide left for forward, right for back
    // Animate dots
    Animated.parallel([
      Animated.spring(dotWidths[from - 1], { toValue: 8, useNativeDriver: false, friction: 8 }),
      Animated.spring(dotWidths[to - 1], { toValue: 24, useNativeDriver: false, friction: 8 }),
    ]).start();
    // Slide out current
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: direction * 300, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(to);
      // Position new content on opposite side
      slideAnim.setValue(-direction * 300);
      // Slide in new
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  // Step 1 fields
  const [tradeCategory, setTradeCategory] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radiusKm, setRadiusKm] = useState('25');
  const [urgencyCapacity, setUrgencyCapacity] = useState<string[]>([]);

  // Step 2 fields
  const [abn, setAbn] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Step 3 fields
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  function addSpecialty() {
    const trimmed = specialtyInput.trim();
    if (trimmed && !specialties.includes(trimmed)) {
      setSpecialties((prev) => [...prev, trimmed]);
    }
    setSpecialtyInput('');
  }

  function removeSpecialty(s: string) {
    setSpecialties((prev) => prev.filter((x) => x !== s));
  }

  function toggleUrgency(option: string) {
    setUrgencyCapacity((prev) =>
      prev.includes(option.toLowerCase())
        ? prev.filter((u) => u !== option.toLowerCase())
        : [...prev, option.toLowerCase()],
    );
  }

  function validateStep1() {
    if (!tradeCategory) return 'Please select a trade category.';
    if (!suburb.trim()) return 'Please enter your suburb.';
    if (!postcode.trim() || postcode.trim().length !== 4) return 'Please enter a valid 4-digit postcode.';
    return null;
  }

  function validateStep2() {
    // ABN and license are optional for MVP but we encourage them
    return null;
  }

  function validateStep3() {
    if (!businessName.trim()) return 'Please enter your business name.';
    if (!phone.trim()) return 'Please enter a contact phone number.';
    return null;
  }

  function handleNext() {
    if (step === 1) {
      const err = validateStep1();
      if (err) { Alert.alert('Missing info', err); return; }
      animateToStep(1, 2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { Alert.alert('Missing info', err); return; }
      animateToStep(2, 3);
    }
  }

  async function handleSubmit() {
    const err = validateStep3();
    if (err) { Alert.alert('Missing info', err); return; }

    setSubmitting(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      Alert.alert('Error', 'You must be signed in to register as a builder.');
      setSubmitting(false);
      return;
    }

    const specialtiesArray = specialties.filter(Boolean);

    // Geocode the builder's location
    const geo = await geocode(`${suburb.trim()} ${postcode.trim()}`);

    const { error: insertError } = await supabase.from('builder_profiles').insert({
      user_id: userData.user.id,
      business_name: businessName.trim(),
      trade_category: tradeCategory.toLowerCase(),
      specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
      suburb: suburb.trim(),
      postcode: postcode.trim(),
      radius_km: parseInt(radiusKm, 10) || 25,
      urgency_capacity: urgencyCapacity.length > 0 ? urgencyCapacity : null,
      bio: bio.trim() || null,
      phone: phone.trim(),
      email: email.trim() || null,
      website: website.trim() || null,
      abn: abn.trim() || null,
      license_key: licenseNumber.trim() || null,
      approved: false,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
    });

    setSubmitting(false);

    if (insertError) {
      if (insertError.message.includes('duplicate')) {
        Alert.alert('Already registered', 'You already have a builder profile.');
      } else {
        Alert.alert('Error', insertError.message);
      }
      return;
    }

    router.replace('/pending-approval');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => (step > 1 ? animateToStep(step, step - 1) : router.back())}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <ThemedText style={[styles.backText, { color: colors.tint }]}>
                {step > 1 ? 'Back' : 'Cancel'}
              </ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold" style={{ color: colors.textSecondary, fontSize: 14 }}>
              Step {step} of 3
            </ThemedText>
          </View>

          {/* Step indicator dots */}
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((s, i) => (
              <Animated.View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: s <= step ? colors.tint : colors.border,
                    width: dotWidths[i],
                  },
                ]}
              />
            ))}
          </View>

          <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: fadeAnim }}>
          <ThemedText type="title" style={styles.title}>
            {step === 1 && 'Your Trade'}
            {step === 2 && 'Credentials'}
            {step === 3 && 'Your Details'}
          </ThemedText>

          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 1 && 'Tell us what trade you do and where you work.'}
            {step === 2 && 'Add your ABN and licence info (optional for now).'}
            {step === 3 && 'How should customers find and contact you?'}
          </ThemedText>

          {/* === STEP 1 === */}
          {step === 1 && (
            <View style={styles.formSection}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>Trade category *</ThemedText>
              <View style={styles.chipGrid}>
                {TRADE_CATEGORIES.map((cat) => {
                  const selected = tradeCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setTradeCategory(cat)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.tintLight : colors.surface,
                          borderColor: selected ? colors.tint : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: selected ? colors.tint : colors.text }]}
                      >
                        {cat}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Specialties
              </ThemedText>
              <View style={[styles.specialtyInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.specialtyInput, { color: colors.text }]}
                  placeholder="e.g. heritage homes, bathrooms…"
                  placeholderTextColor={colors.icon}
                  value={specialtyInput}
                  onChangeText={setSpecialtyInput}
                  onSubmitEditing={addSpecialty}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
                <Pressable
                  onPress={addSpecialty}
                  style={({ pressed }) => [styles.specialtyAddBtn, { backgroundColor: colors.tint }, pressed && { opacity: 0.7 }]}
                  accessibilityLabel="Add specialty"
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.specialtyAddBtnText}>Add</ThemedText>
                </Pressable>
              </View>
              {specialties.length > 0 && (
                <View style={styles.chipGrid}>
                  {specialties.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => removeSpecialty(s)}
                      style={[styles.chip, { backgroundColor: colors.tintLight, borderColor: colors.tint }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${s}`}
                    >
                      <ThemedText style={[styles.chipText, { color: colors.tint }]}>{s}</ThemedText>
                      <ThemedText style={[styles.chipText, { color: colors.tint, marginLeft: 4 }]}>×</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                    Suburb *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="Surry Hills"
                    placeholderTextColor={colors.icon}
                    value={suburb}
                    onChangeText={setSuburb}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                    Postcode *
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="2010"
                    placeholderTextColor={colors.icon}
                    value={postcode}
                    onChangeText={setPostcode}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Service radius (km)
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, width: 110 }]}
                value={radiusKm}
                onChangeText={setRadiusKm}
                keyboardType="number-pad"
              />

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Urgency capacity
              </ThemedText>
              <View style={styles.chipGrid}>
                {URGENCY_OPTIONS.map((opt) => {
                  const selected = urgencyCapacity.includes(opt.toLowerCase());
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => toggleUrgency(opt)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.tintLight : colors.surface,
                          borderColor: selected ? colors.tint : colors.border,
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: selected ? colors.tint : colors.text }]}
                      >
                        {opt}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* === STEP 2 === */}
          {step === 2 && (
            <View style={styles.formSection}>
              {/* Trust banner */}
              <View style={[styles.trustBanner, { backgroundColor: colors.tintLight, borderColor: colors.tint + '30' }]}>
                <ThemedText style={[styles.trustBannerTitle, { color: colors.tint }]}>
                  Why this matters
                </ThemedText>
                <ThemedText style={[styles.trustBannerText, { color: colors.textSecondary }]}>
                  Verified tradies get a "Verified" badge on their profile and rank higher in search results. Customers are 3x more likely to contact verified builders.
                </ThemedText>
              </View>

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                ABN
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="11 222 333 444"
                placeholderTextColor={colors.icon}
                value={abn}
                onChangeText={setAbn}
                keyboardType="number-pad"
              />

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Licence / Registration Number
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. BLD12345"
                placeholderTextColor={colors.icon}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />

              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                  Both fields are optional for now. Document uploads (photos, certificates) are coming soon — we'll verify your details manually.
                </ThemedText>
              </View>
            </View>
          )}

          {/* === STEP 3 === */}
          {step === 3 && (
            <View style={styles.formSection}>
              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Business name *
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Smith's Plumbing"
                placeholderTextColor={colors.icon}
                value={businessName}
                onChangeText={setBusinessName}
              />

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Bio
              </ThemedText>
              <TextInput
                style={[styles.inputMultiline, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Tell customers about your experience, what makes you different..."
                placeholderTextColor={colors.icon}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Phone *
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="0412 345 678"
                placeholderTextColor={colors.icon}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Email
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.icon}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
                Website
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="www.smithsplumbing.com.au"
                placeholderTextColor={colors.icon}
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}
          </Animated.View>

          {/* Action button */}
          {step < 3 ? (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.tint },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleNext}
            >
              <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.tint, opacity: submitting ? 0.6 : 1 },
                pressed && !submitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Submit Application</ThemedText>
              )}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing['2xl'],
    paddingBottom: Spacing['5xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  stepDot: {
    height: 8,
    borderRadius: Radius.full,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  formSection: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    marginTop: Spacing.lg,
    fontSize: 14,
  },
  input: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    marginTop: Spacing.xs,
  },
  inputMultiline: {
    minHeight: 110,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  specialtyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 52,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  specialtyInput: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  specialtyAddBtn: {
    paddingHorizontal: Spacing.lg,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyAddBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  trustBanner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  trustBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trustBannerText: {
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
