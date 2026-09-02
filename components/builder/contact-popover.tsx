/**
 * ContactPopover — ~/bldesy-web/components/enterprise/contact-popover.tsx:
 * the "Contact" trigger + "Contact Details" modal (phone / email copy rows,
 * Send Message at the bottom). Opening the modal reveals a tradie's
 * phone/email — recorded once per mount via the contact-reveal beacon; every
 * copy is recorded too (value-gated billing meter). Guests get nulled contact
 * details from the view, so they see the "No contact details shared" line and
 * the Send Message button, which prompts them to sign in.
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { MessageButton } from '@/components/builder/message-button';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { revealContact, shouldRecordContactReveal } from '@/lib/data/contact';

interface ContactPopoverProps {
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  /** The tradie's user_id — reveals/copies are metered against it; also powers Send Message. */
  recipientId?: string;
  /** Always render the trigger button, even when no contact details are present. */
  alwaysShow?: boolean;
  /** "primary" = the profile's gradient CTA; "chip" = the company page's bordered pill. */
  triggerVariant?: 'primary' | 'chip';
  triggerStyle?: StyleProp<ViewStyle>;
}

function CopyRow({ text, label, recipientId }: { text: string; label: string; recipientId?: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Copying the tradie's phone/email is a contact action — record it.
      if (recipientId) void revealContact(recipientId, 'copy');
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <View style={styles.copyRow}>
      <View style={styles.flex1}>
        <Text style={[styles.copyLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[styles.copyValue, { color: c.textPrimary }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Copy ${label.toLowerCase()}`}
        onPress={handleCopy}
        style={({ pressed }) => [styles.copyBtn, { borderColor: c.border }, pressed && { backgroundColor: c.indigo + '0D' }]}
      >
        <Text style={[styles.copyBtnText, { color: c.indigo }]}>{copied ? 'Copied!' : 'Copy'}</Text>
      </Pressable>
    </View>
  );
}

export function ContactPopover({ contactName, contactPhone, contactEmail, recipientId, alwaysShow, triggerVariant = 'chip', triggerStyle }: ContactPopoverProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [open, setOpen] = useState(false);
  const revealRecorded = useRef(false);
  const hasContact = Boolean(contactPhone || contactEmail || recipientId || alwaysShow);

  // Opening the modal reveals the tradie's phone/email — record it once per mount.
  useEffect(() => {
    if (!open || revealRecorded.current || !recipientId) return;
    if (!shouldRecordContactReveal({ builderUserId: recipientId, phone: contactPhone, email: contactEmail })) return;
    revealRecorded.current = true;
    void revealContact(recipientId, 'reveal');
  }, [open, recipientId, contactPhone, contactEmail]);

  if (!hasContact) return null;

  const primary = triggerVariant === 'primary';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          primary ? styles.primaryTrigger : [styles.chipTrigger, { borderColor: c.border, backgroundColor: c.surface }],
          primary && Shadows.sm,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          triggerStyle,
        ]}
      >
        {primary ? (
          <LinearGradient colors={[c.primary, c.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <Ionicons name="call-outline" size={16} color={primary ? '#fff' : c.textPrimary} />
        <Text style={[styles.triggerText, { color: primary ? '#fff' : c.textPrimary }]}>Contact</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View accessibilityViewIsModal style={[styles.card, Shadows.xl, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.head}>
              <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
                Contact Details
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: c.canvas }]}
              >
                <Ionicons name="close" size={20} color={c.textSecondary} />
              </Pressable>
            </View>

            {contactName ? <Text style={[styles.contactName, { color: c.textSecondary }]}>{contactName}</Text> : null}

            <View style={styles.rows}>
              {contactPhone ? <CopyRow text={contactPhone} label="Phone" recipientId={recipientId} /> : null}
              {contactEmail ? <CopyRow text={contactEmail} label="Email" recipientId={recipientId} /> : null}
              {!contactPhone && !contactEmail && !recipientId ? (
                <Text style={[styles.none, { backgroundColor: c.canvas, color: c.textSecondary }]}>
                  No contact details shared. Use the Send Message button below.
                </Text>
              ) : null}
              {recipientId ? (
                <View style={[styles.messageWrap, { borderTopColor: c.border }]}>
                  <MessageButton recipientId={recipientId} label="Send Message" variant="primary" />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  primaryTrigger: {
    height: 44,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
  },
  chipTrigger: {
    borderWidth: 1,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  triggerText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
  },
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  rows: {
    gap: 4,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  copyLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 12,
  },
  copyValue: {
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
  copyBtn: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
  none: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: 14,
    textAlign: 'center',
  },
  messageWrap: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
