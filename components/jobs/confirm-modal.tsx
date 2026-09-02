/**
 * The website portal's centred confirmation dialog (`fixed inset-0 bg-black/50`
 * → `max-w-sm rounded-2xl bg-surface p-6`): an icon disc, a centred title and
 * body, then Cancel + the action. Shared by the hide/remove-job and
 * withdraw-application dialogs so their copy is the only thing that differs.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ConfirmModalProps {
  visible: boolean;
  /** The 24px icon inside the disc. */
  icon: ReactNode;
  /** Disc background (web: bg-error/10 or bg-border/40). */
  iconBg: string;
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmBusyLabel: string;
  busy?: boolean;
  /** Error-coloured action (web `bg-error`) instead of primary. */
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  visible,
  icon,
  iconBg,
  title,
  body,
  cancelLabel = 'Cancel',
  confirmLabel,
  confirmBusyLabel,
  busy = false,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  function requestClose() {
    if (!busy) onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <Pressable style={styles.overlay} onPress={requestClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable style={[styles.card, Shadows.xl, { backgroundColor: c.surface }]} onPress={() => {}}>
          <View style={[styles.iconDisc, { backgroundColor: iconBg }]}>{icon}</View>
          <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[styles.body, { color: c.textSecondary }]}>{body}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={styles.cancelBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={[
                styles.confirmBtn,
                { backgroundColor: destructive ? c.error : c.primary, opacity: busy ? 0.5 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
            >
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.confirmText}>{confirmBusyLabel}</Text>
                </View>
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
  },
  iconDisc: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  cancelBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  cancelText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  confirmBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bodyBold, fontWeight: '700' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
