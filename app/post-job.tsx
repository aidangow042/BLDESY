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
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/page-header';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const TRADE_TYPES = [
  'Plumber', 'Electrician', 'Carpenter', 'Builder', 'Painter', 'Tiler',
  'Roofer', 'Landscaper', 'Concreter', 'Fencer', 'Plasterer', 'Bricklayer',
  'Handyman', 'Other',
];

const URGENCY_OPTIONS = [
  { label: 'ASAP', value: 'asap' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Flexible', value: 'flexible' },
];

const NEXT_STEPS = [
  { icon: 'notifications-active' as const, text: 'Matching builders get notified' },
  { icon: 'message' as const, text: 'Builders send you their interest' },
  { icon: 'check-circle' as const, text: 'You choose the best fit' },
];

export default function PostJobScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
        <ThemedView style={styles.centeredContainer}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            Sign in required
          </ThemedText>
          <ThemedText style={[styles.centeredSubtext, { color: colors.textSecondary }]}>
            You need to be logged in to post a job.
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      {/* Floating back button over PageHeader gradient */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          styles.floatingBack,
          { top: insets.top + 12 },
        ]}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* PageHeader */}
          <PageHeader
            title="Post a Job"
            subtitle="Get quotes from quality tradies"
            variant="professional"
          />

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <MaterialIcons name="bolt" size={16} color="#0d9488" />
            <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
              Builders typically respond within 2 hours
            </Text>
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
              accessibilityLabel="Job title"
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
              accessibilityLabel="Job description"
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
                    accessibilityRole="button"
                    accessibilityLabel={trade}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.tealLight : colors.surface,
                        borderColor: selected ? colors.teal : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setTradeType(trade)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: selected ? colors.teal : colors.textSecondary },
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
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.tealLight : colors.surface,
                        borderColor: selected ? colors.teal : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setUrgency(opt.value)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: selected ? colors.teal : colors.textSecondary },
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
              accessibilityLabel="Suburb"
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
              accessibilityLabel="Postcode"
            />
          </View>

          {/* Submit — teal gradient button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Post job and get quotes"
            style={({ pressed }) => [styles.submitBtnWrapper, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={['#0d9488', '#0f766e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.submitBtnInner}>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Post Job — Get Quotes</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>

          {/* What happens next */}
          <View style={styles.nextStepsSection}>
            <Text style={[styles.nextStepsTitle, { color: colors.textSecondary }]}>
              What happens next?
            </Text>
            {NEXT_STEPS.map((step, i) => (
              <View key={i} style={styles.nextStepRow}>
                <MaterialIcons name={step.icon} size={16} color={colors.teal} />
                <Text style={[styles.nextStepText, { color: colors.textSecondary }]}>
                  {step.text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  floatingBack: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  fieldGroup: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
    paddingHorizontal: Spacing['2xl'],
  },
  infoBannerText: {
    fontSize: 13,
    fontWeight: '500',
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
    paddingRight: Spacing['2xl'],
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtnWrapper: {
    marginHorizontal: Spacing['2xl'],
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  submitBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  nextStepsSection: {
    paddingTop: 24,
    paddingHorizontal: Spacing['2xl'],
    gap: 10,
    paddingBottom: Spacing.lg,
  },
  nextStepsTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextStepText: {
    fontSize: 13,
    fontWeight: '500',
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
