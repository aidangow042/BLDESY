import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api, ApiError } from '@/lib/api';

export type ReportContentType =
  | 'builder_profile'
  | 'enterprise_profile'
  | 'review'
  | 'job'
  | 'message'
  | 'user'
  | 'ai_response';

type Reason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'sexual'
  | 'violence'
  | 'scam'
  | 'other';

const REASONS: { key: Reason; label: string }[] = [
  { key: 'spam', label: 'Spam or misleading' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'hate_speech', label: 'Hate speech' },
  { key: 'sexual', label: 'Sexual or inappropriate' },
  { key: 'violence', label: 'Violence or threats' },
  { key: 'scam', label: 'Scam or fraud' },
  { key: 'other', label: 'Something else' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  contentType: ReportContentType;
  /** Row id of the offending content; omit only for contentType 'user'. */
  contentId?: string | null;
  /** The user who owns the reported content (enables the block option). */
  reportedUserId?: string | null;
  /** Hide the "also block" checkbox (e.g. when blocking is offered separately). */
  allowBlock?: boolean;
  /** Seed the detail field — used to capture the flagged AI response text. */
  prefillDetail?: string;
  onSubmitted?: (didBlock: boolean) => void;
}

export function ReportModal({
  visible,
  onClose,
  contentType,
  contentId = null,
  reportedUserId = null,
  allowBlock = true,
  prefillDetail,
  onSubmitted,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState('');
  const [block, setBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason(null);
    setDetail('');
    setBlock(false);
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  const canSubmit = reason !== null && !submitting;
  const showBlock = allowBlock && !!reportedUserId;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // For AI-response reports, attach the flagged text so admins have context.
      const userNote = detail.trim();
      const combinedDetail = prefillDetail
        ? `${userNote ? userNote + '\n\n' : ''}Reported AI response:\n"${prefillDetail.slice(0, 1500)}"`
        : userNote || undefined;
      await api.post('/api/report', {
        contentType,
        contentId,
        reportedUserId,
        reason,
        detail: combinedDetail,
        block: showBlock ? block : undefined,
      });
      const didBlock = showBlock && block;
      reset();
      onSubmitted?.(didBlock);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 429) setError('Too many reports. Wait a minute and try again.');
        else if (e.status === 401) setError('Please log in to report content.');
        else setError(e.message || 'Could not submit your report. Try again.');
      } else {
        setError('Network error. Check your connection and try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff' }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: colors.text }]}>Report content</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tell us what&apos;s wrong. Our team reviews every report and removes
            content that breaks our rules.
          </Text>

          <ScrollView style={styles.reasons} keyboardShouldPersistTaps="handled">
            {REASONS.map((r) => {
              const selected = reason === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  style={[
                    styles.reasonRow,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '11' : 'transparent',
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected ? colors.primary : colors.border },
                    ]}
                  >
                    {selected ? (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    ) : null}
                  </View>
                  <Text style={[styles.reasonLabel, { color: colors.text }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="Add detail (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            editable={!submitting}
          />

          {showBlock ? (
            <Pressable
              onPress={() => setBlock((v) => !v)}
              style={styles.blockRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: block }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: block ? colors.primary : colors.border,
                    backgroundColor: block ? colors.primary : 'transparent',
                  },
                ]}
              >
                {block ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>
                Also block this user so they can&apos;t contact you
              </Text>
            </Pressable>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}
              disabled={submitting}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.5 }]}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.btnText, { color: '#fff' }]}>Submit report</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  reasons: { maxHeight: 260 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonLabel: { fontSize: 15, flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontWeight: '800', fontSize: 13, lineHeight: 13 },
  blockLabel: { fontSize: 13, flex: 1, lineHeight: 18 },
  error: { fontSize: 13, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  btn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
    minHeight: 44,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
});
