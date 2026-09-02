/**
 * The portal feeds' "Quick Apply" dialog — the apply modal repeated in
 * ~/bldesy-web/app/portal/jobs/{residential,commercial,contracts}/page.tsx.
 * Copy per feed kind is the website's; the insert goes through
 * lib/data/applications.ts (RLS-direct, like the website).
 */
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { applyToJob } from '@/lib/data/applications';
import type { FeedKind, Job } from '@/lib/data/tradie-jobs';

interface ApplyModalProps {
  visible: boolean;
  job: Job | null;
  kind: FeedKind;
  onClose: () => void;
  /** Fired after a successful insert with the new application id. */
  onApplied: (jobId: string, applicationId: string) => void;
}

export function ApplyModal({ visible, job, kind, onClose, onApplied }: ApplyModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);

  // Fresh draft per job, like the website's setApplyMessage("") on close.
  useEffect(() => {
    if (!visible) setMessage('');
  }, [visible]);

  const accent = kind === 'home' ? c.primary : c.indigo;
  const title = kind === 'contract' ? 'Apply for this contract' : 'Apply for this job';
  const placeholder =
    kind === 'home'
      ? 'Introduce yourself...'
      : "Introduce yourself and explain why you're a great fit...";

  async function handleApply() {
    if (!job || !user || applying) return;
    setApplying(true);
    try {
      const res = await applyToJob(job.id, user.id, message, job);
      onApplied(job.id, res.id);
      onClose();
    } catch (e) {
      // The website feeds close silently on failure; the job page toasts its
      // copy ("Only approved tradies can apply for jobs." / "Couldn't submit…").
      toast.show(e instanceof Error ? e.message : String(e), { variant: 'error' });
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal visible={visible && !!job} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.card, Shadows.xl, { backgroundColor: c.surface }]}>
          <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            {job?.title} — this sends your profile and message straight to the poster.
          </Text>
          <Text style={[styles.label, { color: c.textSecondary }]}>Message (optional)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={c.textSecondary + '80'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.textarea,
              { backgroundColor: c.surface, borderColor: c.border, color: c.textPrimary },
            ]}
            accessibilityLabel="Message (optional)"
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={applying}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              disabled={applying}
              style={[styles.submitBtn, { backgroundColor: accent, opacity: applying ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled: applying, busy: applying }}
            >
              {applying ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>Submit Application</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: { width: '100%', maxWidth: 448, borderRadius: Radius.xl, padding: Spacing['2xl'] },
  title: { fontSize: 18, lineHeight: 28, fontFamily: FontFamily.bodyBold, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body, marginBottom: Spacing.lg },
  label: { fontSize: 14, fontFamily: FontFamily.bodyMedium, fontWeight: '500', marginBottom: 6 },
  textarea: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  cancelText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  submitBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
