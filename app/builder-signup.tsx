import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { geocode, getSuburbSuggestions, getPostcodeForSuburb } from '@/lib/geo';
import { supabase } from '@/lib/supabase';

/* ───────────────────────── Constants ───────────────────────── */

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

const STEP_LABELS = ['Your Trade', 'Credentials', 'Details'];

/* ───────────────────────── Component ───────────────────────── */

export default function BuilderSignupScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dotWidths = useRef([1, 2, 3].map((i) => new Animated.Value(i === 1 ? 24 : 8))).current;

  const scrollRef = useRef<ScrollView>(null);

  // Step 1 fields
  const [tradeCategory, setTradeCategory] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [radiusKm, setRadiusKm] = useState('25');
  const [urgencyCapacity, setUrgencyCapacity] = useState<string[]>([]);
  const [locSuggestions, setLocSuggestions] = useState<string[]>([]);

  // Step 2 fields
  const [abn, setAbn] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Step 3 fields
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  /* ───────────── Step transitions ───────────── */

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

  /* ───────────── Specialty helpers ───────────── */

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

  /* ───────────── Location ───────────── */

  function handleSuburbChange(text: string) {
    setSuburb(text);
    setLocSuggestions(getSuburbSuggestions(text));
    if (text.length < 2) setPostcode('');
  }

  function selectSuburb(sub: string) {
    setSuburb(sub);
    setLocSuggestions([]);
    const pc = getPostcodeForSuburb(sub);
    if (pc) setPostcode(pc);
  }

  async function handleUseCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow location access.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [result] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (result) {
        const sub = result.city || result.subregion || result.district || '';
        const pc = result.postalCode || '';
        setSuburb(sub);
        setPostcode(pc);
      }
    } catch {
      Alert.alert('Error', 'Could not get your location. Please enter it manually.');
    }
  }

  /* ───────────── Validation ───────────── */

  function validateStep1() {
    if (!tradeCategory) return 'Please select a trade category.';
    if (!suburb.trim()) return 'Please enter your suburb.';
    if (!postcode.trim() || postcode.trim().length !== 4) return 'Please enter a valid 4-digit postcode.';
    return null;
  }

  function validateStep3() {
    if (!businessName.trim()) return 'Please enter your business name.';
    if (!phone.trim()) return 'Please enter a contact phone number.';
    return null;
  }

  const step1Valid = !!tradeCategory && suburb.trim().length > 0 && postcode.trim().length === 4;
  const step3Valid = businessName.trim().length > 0 && phone.trim().length > 0;

  /* ───────────── Navigation ───────────── */

  function handleContinue() {
    if (step === 1) {
      const err = validateStep1();
      if (err) { Alert.alert('Missing info', err); return; }
      animateToStep(1, 2);
    } else if (step === 2) {
      animateToStep(2, 3);
    }
  }

  /* ───────────── Submit ───────────── */

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

  /* ───────────── Progress indicator ───────────── */

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
                    <MaterialIcons name="check" size={12} color="#fff" />
                  )}
                </Animated.View>
                {i < 2 && (
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

  /* ───────────── Step 1: Your Trade ───────────── */

  function renderStep1() {
    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          What trade do you do?
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
          Tell us what trade you do and where you work.
        </ThemedText>

        {/* Trade category */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>TRADE CATEGORY *</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {TRADE_CATEGORIES.map((cat) => {
              const selected = tradeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setTradeCategory(cat)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? '#0F6E56' : '#fff',
                      borderColor: selected ? '#0F6E56' : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={cat}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, { color: selected ? '#fff' : colors.text }]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Specialties */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>SPECIALTIES</ThemedText>
          <View style={[styles.specialtyInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <TextInput
              style={[styles.specialtyInput, { color: colors.text }]}
              placeholder="e.g. heritage homes, bathrooms..."
              placeholderTextColor={colors.textSecondary}
              value={specialtyInput}
              onChangeText={setSpecialtyInput}
              onSubmitEditing={addSpecialty}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable
              onPress={addSpecialty}
              style={({ pressed }) => [styles.specialtyAddBtn, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Add specialty"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#0d9488', '#0f766e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.specialtyAddBtnGrad}
              >
                <Text style={styles.specialtyAddBtnText}>Add</Text>
              </LinearGradient>
            </Pressable>
          </View>
          {specialties.length > 0 && (
            <View style={styles.specialtyChips}>
              {specialties.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => removeSpecialty(s)}
                  style={[styles.chip, { backgroundColor: '#E1F5EE', borderColor: '#0F6E56' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${s}`}
                >
                  <Text style={[styles.chipText, { color: '#0F6E56' }]}>{s}</Text>
                  <Text style={[styles.chipText, { color: '#0F6E56', marginLeft: 4 }]}>×</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>LOCATION *</ThemedText>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="Suburb e.g. Surry Hills"
              placeholderTextColor={colors.textSecondary}
              value={suburb}
              onChangeText={handleSuburbChange}
            />
          </View>
          {locSuggestions.length > 0 && (
            <View style={[styles.suggestionsWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
              {locSuggestions.map((sub) => (
                <Pressable
                  key={sub}
                  onPress={() => selectSuburb(sub)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && { backgroundColor: colors.tealBg },
                  ]}
                >
                  <Ionicons name="location" size={14} color={colors.teal} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{sub}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Text style={[styles.postcodePrefix, { color: colors.textSecondary }]}>Postcode</Text>
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="e.g. 2010"
              placeholderTextColor={colors.textSecondary}
              value={postcode}
              onChangeText={setPostcode}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          <Pressable
            onPress={handleUseCurrentLocation}
            style={({ pressed }) => [styles.currentLocBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="navigate" size={14} color="#0F6E56" />
            <Text style={styles.currentLocText}>Use my current location</Text>
          </Pressable>
        </View>

        {/* Service radius */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>SERVICE RADIUS (KM)</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: '#fff', borderColor: colors.border, width: 120 },
            ]}
            value={radiusKm}
            onChangeText={setRadiusKm}
            keyboardType="number-pad"
            placeholder="25"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Urgency capacity */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>URGENCY CAPACITY</ThemedText>
          <View style={styles.urgencyCapacityRow}>
            {URGENCY_OPTIONS.map((opt) => {
              const selected = urgencyCapacity.includes(opt.toLowerCase());
              return (
                <Pressable
                  key={opt}
                  onPress={() => toggleUrgency(opt)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? '#0F6E56' : '#fff',
                      borderColor: selected ? '#0F6E56' : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={opt}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, { color: selected ? '#fff' : colors.text }]}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  /* ───────────── Step 2: Credentials ───────────── */

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          Verify your credentials
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
          Add your ABN and licence info (optional for now).
        </ThemedText>

        {/* Trust banner */}
        <View style={[styles.trustCard, { backgroundColor: '#E1F5EE', borderColor: '#0F6E56' + '30' }]}>
          <View style={styles.trustCardHeader}>
            <MaterialIcons name="verified" size={18} color="#0F6E56" />
            <Text style={[styles.trustCardTitle, { color: '#0F6E56' }]}>Why this matters</Text>
          </View>
          <Text style={[styles.trustCardText, { color: colors.textSecondary }]}>
            Verified tradies get a "Verified" badge on their profile and rank higher in search results. Customers are 3x more likely to contact verified builders.
          </Text>
        </View>

        {/* ABN */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>ABN</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: '#fff', borderColor: colors.border }]}
            placeholder="11 222 333 444"
            placeholderTextColor={colors.textSecondary}
            value={abn}
            onChangeText={setAbn}
            keyboardType="number-pad"
          />
        </View>

        {/* Licence */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>LICENCE / REGISTRATION NUMBER</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: '#fff', borderColor: colors.border }]}
            placeholder="e.g. BLD12345"
            placeholderTextColor={colors.textSecondary}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
          />
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: '#fff', borderColor: colors.border }]}>
          <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
            Both fields are optional for now. Document uploads (photos, certificates) are coming soon — we'll verify your details manually.
          </Text>
        </View>
      </View>
    );
  }

  /* ───────────── Step 3: Your Details ───────────── */

  function renderStep3() {
    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={{ marginBottom: 4 }}>
          Your business details
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.textSecondary }]}>
          How should customers find and contact you?
        </ThemedText>

        {/* Business name */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>BUSINESS NAME *</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: '#fff', borderColor: colors.border }]}
            placeholder="Smith's Plumbing"
            placeholderTextColor={colors.textSecondary}
            value={businessName}
            onChangeText={setBusinessName}
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>BIO</ThemedText>
          <View>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: colors.text, backgroundColor: '#fff', borderColor: colors.border },
              ]}
              placeholder="Tell customers about your experience, what makes you different..."
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {bio.length} / 500
            </Text>
          </View>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>PHONE *</ThemedText>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="0412 345 678"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>EMAIL (OPTIONAL)</ThemedText>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
          </View>
        </View>

        {/* Website */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>WEBSITE (OPTIONAL)</ThemedText>
          <View style={[styles.locationInputWrap, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <MaterialIcons name="language" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.locationInput, { color: colors.text }]}
              placeholder="www.smithsplumbing.com.au"
              placeholderTextColor={colors.textSecondary}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />
          </View>
        </View>
      </View>
    );
  }

  /* ───────────── Main render ───────────── */

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient colors={['#0F4F3E', '#0F6E56']} style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => (step > 1 ? animateToStep(step, step - 1) : router.back())}
          style={styles.headerBack}
          accessibilityRole="button"
          accessibilityLabel={step > 1 ? 'Back' : 'Cancel'}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Register as a Builder</Text>
          <Text style={styles.headerSubtitle}>Join the BLDESY network</Text>
        </View>
        <Text style={styles.headerStepText}>{step}/3</Text>
      </LinearGradient>

      {/* Trust bar */}
      <View style={[styles.trustBar, { backgroundColor: '#E1F5EE' }]}>
        <MaterialIcons name="bolt" size={14} color="#0F6E56" />
        <Text style={styles.trustBarText}>Verified tradies get found first</Text>
      </View>

      {/* Progress indicator */}
      {renderProgressBar()}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: fadeAnim }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom button bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.canvas }]}>
        {step < 3 ? (
          <Pressable
            onPress={handleContinue}
            disabled={step === 1 ? !step1Valid : false}
            style={({ pressed }) => [
              styles.primaryBtn,
              step === 1 && !step1Valid && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <LinearGradient
              colors={step === 1 && !step1Valid ? ['#9CA3AF', '#9CA3AF'] : ['#0d9488', '#0f766e']}
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
            onPress={handleSubmit}
            disabled={submitting || !step3Valid}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!step3Valid || submitting) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit application"
          >
            <LinearGradient
              colors={step3Valid && !submitting ? ['#0d9488', '#0f766e'] : ['#9CA3AF', '#9CA3AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGrad}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Submit Application</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ───────────── Styles ───────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

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

  /* Trust bar */
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  trustBarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F6E56',
  },

  /* Progress */
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    gap: 0,
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
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
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
  },
  progressLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },

  /* Scroll / step content */
  scrollContent: {
    paddingBottom: 24,
  },
  stepContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stepHint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },

  /* Fields */
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 130,
    height: undefined,
    paddingTop: 14,
    paddingBottom: 30,
    textAlignVertical: 'top',
  },

  /* Char count */
  charCount: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 11,
    fontWeight: '500',
  },

  /* Chips */
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  urgencyCapacityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  /* Specialty input */
  specialtyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    overflow: 'hidden',
  },
  specialtyInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  specialtyAddBtn: {
    height: '100%',
    overflow: 'hidden',
  },
  specialtyAddBtnGrad: {
    height: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyAddBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  specialtyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  /* Location */
  locationInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  locationInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  postcodePrefix: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionsWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: -4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  suggestionText: {
    fontSize: 14,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  currentLocText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F6E56',
  },

  /* Trust card (Step 2) */
  trustCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  trustCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trustCardText: {
    fontSize: 13,
    lineHeight: 19,
  },

  /* Info card */
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoCardText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  primaryBtn: {
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
