import { useState } from 'react';
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
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const TRADE_TYPES = ['Plumber', 'Electrician', 'Carpenter', 'Builder', 'Painter', 'Tiler'];
const URGENCY_OPTIONS = [
  { label: 'ASAP', value: 'asap' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Flexible', value: 'flexible' },
];

export default function PostJobScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tradeType, setTradeType] = useState('');
  const [urgency, setUrgency] = useState('');
  const [suburb, setSuburb] = useState('');
  const [postcode, setPostcode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noAuth, setNoAuth] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || !description.trim() || !tradeType || !urgency || !suburb.trim() || !postcode.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields before submitting.');
      return;
    }

    setSubmitting(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setNoAuth(true);
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from('jobs').insert({
      customer_id: userData.user.id,
      title: title.trim(),
      description: description.trim(),
      trade_type: tradeType.toLowerCase(),
      urgency,
      suburb: suburb.trim(),
      postcode: postcode.trim(),
      status: 'open',
    });

    setSubmitting(false);

    if (insertError) {
      Alert.alert('Error', insertError.message);
      return;
    }

    Alert.alert('Job Posted', 'Your job has been posted successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (noAuth) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ThemedView style={styles.centeredContainer}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            Sign in required
          </ThemedText>
          <ThemedText style={[styles.centeredSubtext, { color: colors.textSecondary }]}>
            You need to be logged in to post a job.
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.tint },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: colors.tint }]}>
              Go back
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <ThemedText style={[styles.backText, { color: colors.tint }]}>Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Post a Job</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>JOB TITLE</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            placeholder="e.g. Fix leaking tap"
            placeholderTextColor={colors.icon}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            placeholder="Describe the job in detail..."
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Trade type chips */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>TRADE TYPE</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {TRADE_TYPES.map((trade) => {
              const selected = tradeType === trade;
              return (
                <Pressable
                  key={trade}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.tintLight : colors.surface,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setTradeType(trade)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: selected ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    {trade}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Urgency chips */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>URGENCY</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {URGENCY_OPTIONS.map((opt) => {
              const selected = urgency === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.tintLight : colors.surface,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setUrgency(opt.value)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: selected ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>SUBURB</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            placeholder="e.g. Surry Hills"
            placeholderTextColor={colors.icon}
            value={suburb}
            onChangeText={setSuburb}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: colors.textSecondary }]}>POSTCODE</ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            placeholder="e.g. 2010"
            placeholderTextColor={colors.icon}
            value={postcode}
            onChangeText={setPostcode}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: colors.tint },
            submitting && { opacity: 0.6 },
            pressed && !submitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Post Job</ThemedText>
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
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
    fontSize: 16,
    justifyContent: 'center',
  },
  multilineInput: {
    minHeight: 120,
    height: undefined,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
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
  submitButton: {
    borderRadius: Radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    height: 52,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  centeredText: {
    textAlign: 'center',
  },
  centeredSubtext: {
    textAlign: 'center',
    fontSize: 14,
  },
});
