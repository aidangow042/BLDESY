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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const URGENCY_LABELS: Record<string, string> = {
  asap: 'ASAP',
  this_week: 'This Week',
  flexible: 'Flexible',
};

type Job = {
  id: string;
  title: string;
  description: string | null;
  trade_type: string;
  urgency: string;
  suburb: string;
  postcode: string;
  budget: string | null;
  status: string;
  created_at: string;
};

export default function JobDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [message, setMessage] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);

  const urgencySemanticColor = (urgency: string) => {
    switch (urgency) {
      case 'asap': return { color: colors.error, bg: colors.errorLight };
      case 'this_week': return { color: colors.warning, bg: colors.warningLight };
      case 'flexible': return { color: colors.success, bg: colors.successLight };
      default: return { color: colors.icon, bg: colors.surface };
    }
  };

  useEffect(() => {
    if (id) {
      fetchJob();
      checkExistingApplication();
    }
  }, [id]);

  async function fetchJob() {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setJob(data);
    }
    setLoading(false);
  }

  async function checkExistingApplication() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', id)
      .eq('builder_id', userData.user.id)
      .maybeSingle();

    if (data) {
      setAlreadyApplied(true);
    }
  }

  async function handleApply() {
    setApplying(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      Alert.alert('Error', 'You must be logged in to apply.');
      setApplying(false);
      return;
    }

    const { error: insertError } = await supabase.from('applications').insert({
      job_id: id,
      builder_id: userData.user.id,
      message: message.trim() || null,
      status: 'pending',
    });

    setApplying(false);

    if (insertError) {
      if (insertError.code === '23505') {
        Alert.alert('Already Applied', 'You have already applied to this job.');
        setAlreadyApplied(true);
      } else {
        Alert.alert('Error', insertError.message);
      }
      return;
    }

    setAlreadyApplied(true);
    setShowApplyForm(false);
    Alert.alert('Applied!', 'Your application has been submitted.');
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centeredContainer}>
          <ThemedText type="subtitle">Job not found</ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <ThemedText style={[styles.linkText, { color: colors.tint }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const uc = urgencySemanticColor(job.urgency);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={[styles.backText, { color: colors.tint }]}>Back</ThemedText>
        </Pressable>

        {/* Title */}
        <ThemedText type="title" style={styles.titleText}>{job.title}</ThemedText>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.tradeBadge, { backgroundColor: colors.tintLight }]}>
            <ThemedText style={[styles.tradeBadgeText, { color: colors.tint }]}>{job.trade_type}</ThemedText>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: uc.bg }]}>
            <ThemedText style={[styles.urgencyBadgeText, { color: uc.color }]}>
              {URGENCY_LABELS[job.urgency] ?? job.urgency}
            </ThemedText>
          </View>
          {job.status !== 'open' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ThemedText style={[styles.statusBadgeText, { color: colors.textSecondary }]}>
                {job.status}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Info sections */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>Location</ThemedText>
            <ThemedText style={{ color: colors.textSecondary }}>
              {job.suburb}, {job.postcode}
            </ThemedText>
          </View>

          {job.budget ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.infoRow}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>Budget</ThemedText>
                <ThemedText style={{ color: colors.textSecondary }}>{job.budget}</ThemedText>
              </View>
            </>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.infoRow}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>Posted</ThemedText>
            <ThemedText style={{ color: colors.textSecondary }}>
              {new Date(job.created_at).toLocaleDateString('en-AU')}
            </ThemedText>
          </View>
        </View>

        {/* Description */}
        {job.description ? (
          <View style={[styles.descriptionSection, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14, marginBottom: Spacing.sm }}>Description</ThemedText>
            <ThemedText style={[styles.descriptionText, { color: colors.text }]}>
              {job.description}
            </ThemedText>
          </View>
        ) : null}

        {/* Apply section */}
        {alreadyApplied ? (
          <View style={[styles.appliedBanner, { backgroundColor: colors.successLight, borderColor: colors.success + '30' }]}>
            <ThemedText style={[styles.appliedText, { color: colors.success }]}>
              You've applied to this job
            </ThemedText>
          </View>
        ) : job.status !== 'open' ? (
          <View style={[styles.appliedBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[styles.appliedText, { color: colors.textSecondary }]}>
              This job is no longer open
            </ThemedText>
          </View>
        ) : showApplyForm ? (
          <View style={styles.applyForm}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>Message (optional)</ThemedText>
            <TextInput
              style={[styles.messageInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="Introduce yourself and why you're a good fit..."
              placeholderTextColor={colors.icon}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.tint, opacity: applying ? 0.6 : 1 },
                pressed && !applying && { opacity: 0.7 },
              ]}
              onPress={handleApply}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Submit Application</ThemedText>
              )}
            </Pressable>
            <Pressable
              onPress={() => setShowApplyForm(false)}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.applyButton,
              { backgroundColor: colors.tint },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setShowApplyForm(true)}
          >
            <ThemedText style={styles.applyButtonText}>Apply to this Job</ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  contentContainer: {
    padding: Spacing['2xl'],
    gap: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleText: {
    marginTop: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tradeBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tradeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  urgencyBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  urgencyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  infoSection: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  descriptionSection: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  applyButton: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  applyForm: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.md,
    fontSize: 15,
    minHeight: 110,
  },
  submitButton: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  appliedBanner: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  appliedText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
