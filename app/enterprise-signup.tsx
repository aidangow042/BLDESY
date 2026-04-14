/**
 * Enterprise signup — 4-step wizard for company registration.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { getSuburbSuggestions } from '@/lib/geo';
import { PageHeader } from '@/components/page-header';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '200+'];
const STEP_LABELS = ['Company Details', 'Profile', 'Trades & Credentials', 'Review'];

const TRADE_OPTIONS = [
  'Builder', 'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Landscaper',
  'Roofer', 'Tiler', 'Concreter', 'Bricklayer', 'Scaffolder', 'Demolition',
  'Air Conditioning', 'Solar Installer', 'Gas Fitter', 'Fencer', 'Glazier',
  'Waterproofer', 'Cabinet Maker', 'Flooring', 'Plasterer',
];

export default function EnterpriseSignupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Company Details
  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Step 2: Profile
  const [companySize, setCompanySize] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Step 3: Trades & Credentials
  const [tradesNeeded, setTradesNeeded] = useState<string[]>([]);
  const [licenceNumber, setLicenceNumber] = useState('');
  const [insuranceDetails, setInsuranceDetails] = useState('');

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC';
  const inputBorder = isDark ? colors.border : '#E2E8F0';

  function toggleTrade(trade: string) {
    setTradesNeeded(prev =>
      prev.includes(trade) ? prev.filter(t => t !== trade) : [...prev, trade],
    );
  }

  async function handleSuburbInput(text: string) {
    setSuburb(text);
    if (text.length >= 2) {
      const results = await getSuburbSuggestions(text, 5);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }

  function selectSuburb(item: any) {
    setSuburb(item.suburb || item.locality || item.name || '');
    setPostcode(String(item.postcode || ''));
    setSuggestions([]);
  }

  async function handleSubmit() {
    if (!companyName.trim()) { Alert.alert('Error', 'Company name is required'); return; }
    if (!contactName.trim()) { Alert.alert('Error', 'Contact name is required'); return; }

    setSaving(true);
    if (!userId) { setSaving(false); Alert.alert('Error', 'Not logged in'); return; }

    const { error } = await supabase.from('enterprise_profiles').insert({
      user_id: userId,
      company_name: companyName.trim(),
      abn: abn.replace(/\s/g, '') || null,
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      company_size: companySize || null,
      industry_focus: industryFocus.trim() || null,
      bio: bio.trim() || null,
      website: website.trim() || null,
      suburb: suburb.trim() || null,
      postcode: postcode || null,
      trades_needed: tradesNeeded,
      licence_number: licenceNumber.trim() || null,
      insurance_details: insuranceDetails.trim() || null,
      status: 'pending_review',
    });

    if (error) {
      setSaving(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Update profile role to enterprise (via SECURITY DEFINER RPC — client can't set role directly)
    const { error: roleError } = await supabase.rpc('set_role_enterprise');
    if (roleError) {
      setSaving(false);
      Alert.alert('Error', 'Failed to set enterprise role. Please try again.');
      return;
    }

    setSaving(false);
    router.replace('/pending-approval' as any);
  }

  function renderStep1() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Company Details</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Company Name *</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={companyName} onChangeText={setCompanyName} placeholder="e.g. Smith Construction Pty Ltd" placeholderTextColor={colors.textSecondary} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>ABN</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={abn} onChangeText={setAbn} placeholder="XX XXX XXX XXX" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={14} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Name *</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={contactName} onChangeText={setContactName} placeholder="Your full name" placeholderTextColor={colors.textSecondary} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Email</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={contactEmail} onChangeText={setContactEmail} placeholder="you@company.com" placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Phone</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={contactPhone} onChangeText={setContactPhone} placeholder="04XX XXX XXX" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Company Profile</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Company Size</Text>
        <View style={styles.chipRow}>
          {COMPANY_SIZES.map(size => (
            <Pressable key={size} style={[styles.chip, { backgroundColor: companySize === size ? indigo : inputBg, borderColor: companySize === size ? indigo : inputBorder }]} onPress={() => setCompanySize(size)}>
              <Text style={[styles.chipText, { color: companySize === size ? '#fff' : colors.text }]}>{size}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Industry Focus</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={industryFocus} onChangeText={setIndustryFocus} placeholder="e.g. Residential construction" placeholderTextColor={colors.textSecondary} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>About Your Company</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={bio} onChangeText={setBio} placeholder="Tell tradies about your company..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} textAlignVertical="top" />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Website</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={website} onChangeText={setWebsite} placeholder="https://yourcompany.com.au" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Primary Location</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={suburb} onChangeText={handleSuburbInput} placeholder="Start typing suburb..." placeholderTextColor={colors.textSecondary} />
        {suggestions.length > 0 && (
          <View style={[styles.suggestionsList, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: inputBorder }]}>
            {suggestions.map((s, i) => (
              <Pressable key={i} style={styles.suggestionItem} onPress={() => selectSuburb(s)}>
                <Text style={[styles.suggestionText, { color: colors.text }]}>{s.suburb || s.locality || s.name}, {s.postcode}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderStep3() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Trades & Credentials</Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Select the trades you hire for</Text>

        <View style={styles.tradeGrid}>
          {TRADE_OPTIONS.map(trade => {
            const selected = tradesNeeded.includes(trade.toLowerCase());
            return (
              <Pressable key={trade} style={[styles.tradeChip, { backgroundColor: selected ? indigoBg : inputBg, borderColor: selected ? indigo : inputBorder }]} onPress={() => toggleTrade(trade.toLowerCase())}>
                {selected && <Ionicons name="checkmark-circle" size={16} color={indigo} />}
                <Text style={[styles.tradeChipText, { color: selected ? indigo : colors.text }]}>{trade}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>Builder Licence Number</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={licenceNumber} onChangeText={setLicenceNumber} placeholder="Optional" placeholderTextColor={colors.textSecondary} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Insurance Details</Text>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={insuranceDetails} onChangeText={setInsuranceDetails} placeholder="e.g. Public liability $20M" placeholderTextColor={colors.textSecondary} />
      </View>
    );
  }

  function renderStep4() {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Submit</Text>

        <View style={[styles.reviewCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: inputBorder }]}>
          <ReviewRow label="Company" value={companyName} colors={colors} />
          {abn ? <ReviewRow label="ABN" value={abn} colors={colors} /> : null}
          <ReviewRow label="Contact" value={contactName} colors={colors} />
          {contactEmail ? <ReviewRow label="Email" value={contactEmail} colors={colors} /> : null}
          {contactPhone ? <ReviewRow label="Phone" value={contactPhone} colors={colors} /> : null}
          {companySize ? <ReviewRow label="Size" value={companySize + ' employees'} colors={colors} /> : null}
          {suburb ? <ReviewRow label="Location" value={`${suburb} ${postcode}`} colors={colors} /> : null}
          {tradesNeeded.length > 0 && <ReviewRow label="Trades" value={tradesNeeded.join(', ')} colors={colors} />}
        </View>

        <Text style={[styles.reviewNote, { color: colors.textSecondary }]}>
          Your application will be reviewed within 1-2 business days. We'll notify you once approved.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Enterprise Signup" subtitle="Register your company" />

      {/* Step indicators */}
      <View style={styles.stepIndicators}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <View key={label} style={styles.stepDot}>
              <View style={[styles.dot, { backgroundColor: isActive ? indigo : isDone ? colors.success : colors.border }]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.dotText, { color: isActive ? '#fff' : colors.textSecondary }]}>{stepNum}</Text>
                )}
              </View>
              <Text style={[styles.dotLabel, { color: isActive ? indigo : colors.textSecondary }]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom navigation */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.canvas }]}>
        {step > 1 && (
          <Pressable style={[styles.backBtn, { borderColor: inputBorder }]} onPress={() => setStep(step - 1)}>
            <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, { backgroundColor: indigo, opacity: saving ? 0.7 : 1 }]}
          onPress={step < 4 ? () => setStep(step + 1) : handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>{step < 4 ? 'Continue' : 'Submit Application'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ReviewRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stepIndicators: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  stepDot: { alignItems: 'center', gap: 4 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 12, fontWeight: '700' },
  dotLabel: { fontSize: 10, fontWeight: '600' },
  scroll: { paddingBottom: 100 },
  stepContent: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  stepTitle: { ...Type.h1, marginBottom: Spacing.sm },
  stepSubtitle: { ...Type.body, marginBottom: Spacing.sm },
  label: { ...Type.captionSemiBold, marginTop: Spacing.sm },
  input: { height: 48, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, fontSize: 15 },
  textArea: { height: 100, paddingTop: Spacing.md },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  chipText: { ...Type.captionSemiBold },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tradeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  tradeChipText: { ...Type.caption, fontWeight: '600' },
  suggestionsList: { borderWidth: 1, borderRadius: Radius.md, marginTop: -4, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  suggestionText: { ...Type.body },
  reviewCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  reviewLabel: { ...Type.captionSemiBold, width: 80 },
  reviewValue: { ...Type.body, flex: 1, textAlign: 'right' },
  reviewNote: { ...Type.caption, textAlign: 'center', marginTop: Spacing.lg },
  bottomBar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  backBtn: { height: 48, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'] },
  backBtnText: { ...Type.btnSecondary },
  nextBtn: { flex: 1, height: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', ...Type.btnPrimary },
});
