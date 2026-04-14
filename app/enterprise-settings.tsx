/**
 * Enterprise Settings -- editable company fields with save to enterprise_profiles.
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

export default function EnterpriseSettingsScreen() {
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

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [industryFocus, setIndustryFocus] = useState('');

  const loadSettings = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const { data } = await supabase
      .from('enterprise_profiles')
      .select('company_name, contact_name, contact_email, contact_phone, industry_focus')
      .eq('user_id', userId)
      .single();

    if (data) {
      setCompanyName(data.company_name || '');
      setContactName(data.contact_name || '');
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setIndustryFocus(data.industry_focus || '');
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  async function handleSave() {
    if (!companyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }

    setSaving(true);
    if (!userId) { setSaving(false); Alert.alert('Error', 'Not logged in'); return; }

    const { error } = await supabase
      .from('enterprise_profiles')
      .update({
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        industry_focus: industryFocus.trim() || null,
      })
      .eq('user_id', userId);

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Saved', 'Your settings have been updated.');
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={indigo} style={{ marginTop: 100 }} />
      </View>
    );
  }

  const fields: { label: string; value: string; onChange: (t: string) => void; placeholder: string; keyboardType?: any; autoCapitalize?: any }[] = [
    { label: 'Company Name *', value: companyName, onChange: setCompanyName, placeholder: 'e.g. Smith Construction Pty Ltd' },
    { label: 'Contact Name', value: contactName, onChange: setContactName, placeholder: 'Your full name' },
    { label: 'Contact Email', value: contactEmail, onChange: setContactEmail, placeholder: 'you@company.com', keyboardType: 'email-address', autoCapitalize: 'none' },
    { label: 'Contact Phone', value: contactPhone, onChange: setContactPhone, placeholder: '04XX XXX XXX', keyboardType: 'phone-pad' },
    { label: 'Industry Focus', value: industryFocus, onChange: setIndustryFocus, placeholder: 'e.g. Residential construction' },
  ];

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info card */}
          <View style={[styles.infoCard, { backgroundColor: indigoBg, borderColor: isDark ? '#312e81' : '#c7d2fe' }]}>
            <Ionicons name="information-circle" size={20} color={indigo} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Update your company details below. Changes are saved to your enterprise profile.
            </Text>
          </View>

          {/* Form fields */}
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            {fields.map((field, i) => (
              <View key={field.label}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{field.label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                />
                {i < fields.length - 1 && <View style={{ height: Spacing.sm }} />}
              </View>
            ))}
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
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  infoText: { ...Type.caption, flex: 1 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  label: {
    ...Type.captionSemiBold,
    marginBottom: 4,
    marginTop: Spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  saveBtn: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', ...Type.btnPrimary },
});
