import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api, ApiError } from '@/lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({ visible, onClose, onDeleted }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPassword('');
    setConfirmText('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  const canSubmit = password.length > 0 && confirmText.trim().toUpperCase() === 'DELETE' && !submitting;

  async function handleConfirm() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/api/auth/delete-account', { password });
      reset();
      onDeleted();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Password is incorrect.');
        else if (e.status === 429) setError('Too many attempts. Wait a minute and try again.');
        else setError(e.message || 'Could not delete your account. Try again.');
      } else {
        setError('Network error. Check your connection and try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff' }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: colors.error }]}>Delete account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            This permanently removes your profile, jobs, applications, saved tradies and messages.
            It cannot be undone.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Confirm your password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
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

          <Text style={[styles.label, { color: colors.text }]}>
            Type DELETE to confirm
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
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

          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[styles.btn, { borderColor: colors.border, borderWidth: 1 }]}
              disabled={submitting}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.error,
                  opacity: canSubmit ? 1 : 0.5,
                },
              ]}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.btnText, { color: '#fff' }]}>Delete my account</Text>
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
  label: { fontSize: 13, fontWeight: '600', marginTop: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
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
    minWidth: 100,
    minHeight: 44,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
});
