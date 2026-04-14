/**
 * Enterprise Edit Profile -- full-form editor for enterprise company profiles.
 * Fetches existing data on mount and updates enterprise_profiles on save.
 */
import { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { getSuburbSuggestions } from '@/lib/geo';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '200+'];

const TRADE_OPTIONS = [
  'Builder', 'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Landscaper',
  'Roofer', 'Tiler', 'Concreter', 'Bricklayer', 'Scaffolder', 'Demolition',
  'Air Conditioning', 'Solar Installer', 'Gas Fitter', 'Fencer', 'Glazier',
  'Waterproofer', 'Cabinet Maker', 'Flooring', 'Plasterer',
];

export default function EnterpriseEditProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC';
  const inputBorder = isDark ? colors.border : '#E2E8F0';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [tradesNeeded, setTradesNeeded] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const loadProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const { data } = await supabase
      .from('enterprise_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setCompanyName(data.company_name || '');
      setAbn(data.abn || '');
      setContactName(data.contact_name || '');
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setCompanySize(data.company_size || '');
      setIndustryFocus(data.industry_focus || '');
      setBio(data.bio || '');
      setWebsite(data.website || '');
      setSuburb(data.suburb || '');
      setPostcode(data.postcode || '');
      setTradesNeeded(data.trades_needed || []);
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  function toggleTrade(trade: string) {
    setTradesNeeded(prev =>
      prev.includes(trade) ? prev.filter(t => t !== trade) : [...prev, trade],
    );
  }

  function handleSuburbInput(text: string) {
    setSuburb(text);
    if (text.length >= 2) {
      setSuggestions(getSuburbSuggestions(text, 5));
    } else {
      setSuggestions([]);
    }
  }

  function selectSuburb(name: string) {
    setSuburb(name);
    setSuggestions([]);
  }

  async function handleSave() {
    if (!companyName.trim()) { Alert.alert('Error', 'Company name is required'); return; }

    setSaving(true);
    if (!userId) { setSaving(false); Alert.alert('Error', 'Not logged in'); return; }

    const { error } = await supabase
      .from('enterprise_profiles')
      .update({
        company_name: companyName.trim(),
        abn: abn.replace(/\s/g, '') || null,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        company_size: companySize || null,
        industry_focus: industryFocus.trim() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        suburb: suburb.trim() || null,
        postcode: postcode || null,
        trades_needed: tradesNeeded,
      })
      .eq('user_id', userId);

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Saved', 'Your profile has been updated.');
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={indigo} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1e1b4b', '#312e81'] : ['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Company Details */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Company Details</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Company Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={companyName} onChangeText={setCompanyName} placeholder="e.g. Smith Construction Pty Ltd" placeholderTextColor={colors.textSecondary} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>ABN</Text>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={abn} onChangeText={setAbn} placeholder="XX XXX XXX XXX" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={14} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Name</Text>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={contactName} onChangeText={setContactName} placeholder="Your full name" placeholderTextColor={colors.textSecondary} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Phone</Text>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={contactPhone} onChangeText={setContactPhone} placeholder="04XX XXX XXX" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Contact Email</Text>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={contactEmail} onChangeText={setContactEmail} placeholder="you@company.com" placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />

          {/* Company Profile */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing['2xl'] }]}>Company Profile</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Company Size</Text>
          <View style={styles.chipRow}>
            {COMPANY_SIZES.map(size => (
              <Pressable
                key={size}
                style={[styles.chip, { backgroundColor: companySize === size ? indigo : inputBg, borderColor: companySize === size ? indigo : inputBorder }]}
                onPress={() => setCompanySize(size)}
              >
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

          {/* Location */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing['2xl'] }]}>Location</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Suburb</Text>
          <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]} value={suburb} onChangeText={handleSuburbInput} placeholder="Start typing suburb..." placeholderTextColor={colors.textSecondary} />
          {suggestions.length > 0 && (
            <View style={[styles.suggestionsList, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: inputBorder }]}>
              {suggestions.map((s, i) => (
                <Pressable key={i} style={styles.suggestionItem} onPress={() => selectSuburb(s)}>
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Trades Needed */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing['2xl'] }]}>Trades Needed</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Select the trades you hire for</Text>

          <View style={styles.tradeGrid}>
            {TRADE_OPTIONS.map(trade => {
              const key = trade.toLowerCase();
              const selected = tradesNeeded.includes(key);
              return (
                <Pressable
                  key={trade}
                  style={[styles.tradeChip, { backgroundColor: selected ? indigoBg : inputBg, borderColor: selected ? indigo : inputBorder }]}
                  onPress={() => toggleTrade(key)}
                >
                  {selected && <Ionicons name="checkmark-circle" size={16} color={indigo} />}
                  <Text style={[styles.tradeChipText, { color: selected ? indigo : colors.text }]}>{trade}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Save button */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: indigo, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  sectionTitle: { ...Type.h2, marginBottom: Spacing.sm },
  sectionSubtitle: { ...Type.caption, marginBottom: Spacing.sm },
  label: { ...Type.captionSemiBold, marginTop: Spacing.sm, marginBottom: 4 },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: { height: 100, paddingTop: Spacing.md },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  chipText: { ...Type.captionSemiBold },
  tradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  tradeChipText: { ...Type.caption, fontWeight: '600' },
  suggestionsList: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: -4,
    overflow: 'hidden',
  },
  suggestionItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  suggestionText: { ...Type.body },
  saveBtn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3xl'],
  },
  saveBtnText: { color: '#fff', ...Type.btnPrimary },
});
