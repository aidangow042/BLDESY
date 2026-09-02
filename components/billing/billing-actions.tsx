/**
 * Native subscription management — port of
 * `~/bldesy-web/app/portal/billing/native-actions.tsx` minus the card form:
 *
 *   - CancelSubscriptionButton → sets cancel_at_period_end: true (with dialog)
 *   - ResumeSubscriptionButton → clears cancel_at_period_end (one tap)
 *   - UpdateCardControl        → the web's UpdateCardButton slot. The app
 *                                never captures a card: iOS shows only the
 *                                plain "Manage your card on the web" note (no
 *                                link, no button — App Store 3.1.1); Android
 *                                hands off to the website's billing page.
 *
 * Cancel / resume are allowed everywhere (they never change what is charged).
 */
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import { cancelSubscription, resumeSubscription } from '@/lib/data/billing';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { openWebOnboarding } from '@/lib/web-onboarding';

export const MANAGE_CARD_ON_WEB = 'Manage your card on the web at bldesy.com.au';

/* ── Modal shell ─────────────────────────────────────────────────── */

export function BillingModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.dialog, Shadows.xl, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.dialogHeader, { borderBottomColor: c.border }]}>
            <Text accessibilityRole="header" style={[styles.dialogTitle, { color: c.textPrimary }]}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={6}>
              <Ionicons name="close" size={20} color={c.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.dialogBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

/* ── Cancel button + dialog ──────────────────────────────────────── */

export function CancelSubscriptionButton({
  periodEndsAt,
  onSuccess,
}: {
  periodEndsAt: string | null;
  onSuccess: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onConfirm() {
    setSubmitting(true);
    try {
      await cancelSubscription();
      toast.show('Subscription set to cancel at period end.', { variant: 'success' });
      setOpen(false);
      onSuccess();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || "Couldn't cancel subscription." : 'Network error. Please try again.', {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.cancelLink}>
        <Text style={[styles.cancelLinkText, { color: c.textSecondary }]}>Cancel subscription</Text>
      </Pressable>
      <BillingModal open={open} onClose={() => !submitting && setOpen(false)} title="Cancel subscription?">
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Your subscription will stay active until
          {periodEndsAt ? (
            <>
              {' '}
              <Text style={[styles.strong, { color: c.textPrimary }]}>{periodEndsAt}</Text>
            </>
          ) : (
            ' the end of your current billing period'
          )}
          . After that, your profile goes offline and you&apos;ll stop being matched to jobs.
        </Text>
        <Text style={[styles.body, styles.bodyGap, { color: c.textSecondary }]}>
          You can resume any time before then with one click.
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => setOpen(false)}
            style={[styles.button, styles.buttonOutline, { borderColor: c.border }, submitting && styles.disabled]}
          >
            <Text style={[styles.buttonText, { color: c.textPrimary }]}>Keep subscription</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void onConfirm()}
            style={[styles.button, { backgroundColor: c.error }, submitting && styles.disabled]}
          >
            <Text style={[styles.buttonText, styles.buttonTextBold, { color: '#ffffff' }]}>
              {submitting ? 'Cancelling…' : 'Cancel at period end'}
            </Text>
          </Pressable>
        </View>
      </BillingModal>
    </>
  );
}

/* ── Resume button (no dialog — one tap) ─────────────────────────── */

export function ResumeSubscriptionButton({ onSuccess }: { onSuccess: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function onPress() {
    setSubmitting(true);
    try {
      await resumeSubscription();
      toast.show('Subscription resumed.', { variant: 'success' });
      onSuccess();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || "Couldn't resume subscription." : 'Network error. Please try again.', {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={submitting}
      onPress={() => void onPress()}
      style={[styles.resume, { backgroundColor: c.success }, submitting && styles.disabled]}
    >
      {submitting ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Ionicons name="refresh-outline" size={16} color="#ffffff" />
      )}
      <Text style={[styles.buttonText, styles.buttonTextBold, { color: '#ffffff' }]}>
        {submitting ? 'Resuming…' : 'Resume subscription'}
      </Text>
    </Pressable>
  );
}

/* ── Update card slot ────────────────────────────────────────────── */

export function UpdateCardControl({
  triggerLabel = 'Update',
  prominent = false,
  onReturn,
}: {
  triggerLabel?: string;
  /** Web `triggerClassName` variant — a filled primary button instead of the text link. */
  prominent?: boolean;
  onReturn?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  if (!CAN_SELL_IN_APP) {
    return <Text style={[styles.webNote, { color: c.textSecondary }]}>{MANAGE_CARD_ON_WEB}</Text>;
  }

  async function open() {
    await openWebOnboarding('builder', 'portal/billing');
    onReturn?.();
  }

  if (prominent) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => void open()}
        style={[styles.button, styles.prominent, { backgroundColor: c.primary }]}
      >
        <Text style={[styles.buttonText, { color: '#ffffff' }]}>{triggerLabel}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => void open()} hitSlop={6}>
      <Text style={[styles.updateLink, { color: c.primary }]}>{triggerLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    width: '100%',
    maxWidth: 448,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  dialogTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  dialogBody: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  bodyGap: {
    marginTop: Spacing.md,
  },
  strong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  button: {
    minHeight: 44,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  buttonTextBold: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  cancelLink: {
    minHeight: 32,
    justifyContent: 'center',
  },
  cancelLinkText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    minHeight: 44,
  },
  webNote: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  updateLink: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  prominent: {
    alignSelf: 'center',
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
});
