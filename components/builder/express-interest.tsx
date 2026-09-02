/**
 * Express Interest — ~/bldesy-web/components/builder/express-interest.tsx, the
 * lead capture on the public builder profile. Signed-out visitors get a
 * name/email/phone form; signed-in visitors get a confirm surface pre-filled
 * from their account. A phone typed here is stored on the EOI record only —
 * the account login phone is OTP-verified and never written from this flow;
 * we nudge to the profile's verify flow instead. Submits through
 * `submitExpressionOfInterest` (POST /api/eoi via the website API).
 */
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { EOI_GENERIC_ERROR, EOI_MESSAGE_MAX_LENGTH, EoiError, submitExpressionOfInterest } from '@/lib/data/eoi';
import { formatAuMobile, isValidAuMobile } from '@/lib/web/phone';
import { ROUTES } from '@/lib/routes';

interface ExpressInterestModalProps {
  visible: boolean;
  onClose: () => void;
  builderId: string;
  businessName: string;
}

/** Website copy (express-interest.tsx). */
export const EOI_NAME_REQUIRED = "Add your name so they know who's keen.";
export const EOI_EMAIL_REQUIRED = 'Add an email so they can reach you.';
export const EOI_PHONE_INVALID = "That mobile number doesn't look right — try 04xx xxx xxx.";

/** Pure validation of the submit — the web's inline checks, in order. */
export function validateEoi(input: { name: string; email: string; phone: string; accountPhone: string | null }): string | null {
  if (!input.name.trim()) return EOI_NAME_REQUIRED;
  if (!input.email.trim()) return EOI_EMAIL_REQUIRED;
  if (!input.accountPhone && input.phone.trim() && !isValidAuMobile(input.phone)) return EOI_PHONE_INVALID;
  return null;
}

export function ExpressInterestModal({ visible, onClose, builderId, businessName }: ExpressInterestModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { authedUser: user, loading } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentWithNewPhone, setSentWithNewPhone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase sets email/phone to "" (not null) on accounts that signed up
  // with only the other channel — || treats those as absent.
  const accountEmail = user?.email || null;
  const accountPhone = user?.phone || null;
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const accountName =
    (typeof meta?.name === 'string' && meta.name) || (typeof meta?.full_name === 'string' && meta.full_name) || null;

  // Prefill the editable name once per open — the account name is a default, not a lock.
  useEffect(() => {
    if (visible) setName((n) => n || accountName || '');
  }, [visible, accountName]);

  async function submit() {
    setError(null);
    const sendName = name;
    const sendEmail = accountEmail ?? email;
    const sendPhone = accountPhone ?? phone;

    const invalid = validateEoi({ name: sendName, email: sendEmail, phone, accountPhone });
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    try {
      await submitExpressionOfInterest({
        tradie_id: builderId,
        name: sendName.trim(),
        email: sendEmail.trim() || undefined,
        phone: sendPhone.trim() || undefined,
        message: message.trim() || undefined,
      });
      setSent(true);
      setSentWithNewPhone(Boolean(user && !accountPhone && phone.trim()));
    } catch (e) {
      setError(e instanceof EoiError ? e.message : EOI_GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { backgroundColor: c.canvas, borderColor: c.border, color: c.textPrimary }];
  const labelStyle = [styles.label, { color: c.textSecondary }];

  const messageField = (
    <View>
      <Text style={labelStyle}>What do you want to say? (optional)</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="e.g. Burst pipe under the kitchen sink — are you free this week?"
        placeholderTextColor={c.textSecondary + '99'}
        multiline
        maxLength={EOI_MESSAGE_MAX_LENGTH}
        style={[inputStyle, styles.textarea]}
        accessibilityLabel="What do you want to say? (optional)"
      />
    </View>
  );

  const phoneField = (
    <View>
      <Text style={labelStyle}>Mobile (optional)</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="04xx xxx xxx"
        placeholderTextColor={c.textSecondary + '99'}
        keyboardType="phone-pad"
        autoComplete="tel"
        style={inputStyle}
        accessibilityLabel="Mobile (optional)"
      />
      <Text style={[styles.hint, { color: c.textSecondary }]}>Lets {businessName} text you directly.</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View accessibilityViewIsModal accessibilityLabel={`Express interest in ${businessName}`} style={[styles.card, Shadows.xl, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: c.canvas }]}
          >
            <Ionicons name="close" size={20} color={c.textSecondary} />
          </Pressable>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {sent ? (
              <View style={styles.headRow}>
                <View style={[styles.iconBubble, { backgroundColor: c.primary + '1A' }]}>
                  <Ionicons name="checkmark" size={20} color={c.primary} />
                </View>
                <View style={styles.flex1}>
                  <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
                    Sent! {businessName} will be in touch.
                  </Text>
                  {sentWithNewPhone ? (
                    <Text style={[styles.sub, { color: c.textSecondary }]}>
                      Want tradies to always reach you on that number?{' '}
                      <Text
                        accessibilityRole="link"
                        onPress={() => {
                          onClose();
                          router.push(ROUTES.dashboard as Href);
                        }}
                        style={[styles.link, { color: c.primary }]}
                      >
                        Verify it on your profile
                      </Text>
                      .
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.headRow}>
                  <View style={[styles.iconBubble, { backgroundColor: c.primary + '1A' }]}>
                    <Ionicons name="flame-outline" size={20} color={c.primary} />
                  </View>
                  <View style={styles.flex1}>
                    <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
                      Keen to work with {businessName}?
                    </Text>
                    <Text style={[styles.sub, { color: c.textSecondary }]}>
                      {user ? `We'll send ${businessName} your details:` : "Drop your details and they'll get back to you."}
                    </Text>
                  </View>
                </View>

                {loading ? null : user ? (
                  /* Signed in — confirm surface, account details read-only. */
                  <View style={styles.form}>
                    <View>
                      <Text style={labelStyle}>Name</Text>
                      <TextInput value={name} onChangeText={setName} autoComplete="name" style={inputStyle} accessibilityLabel="Name" />
                    </View>
                    <View style={[styles.accountBox, { backgroundColor: c.canvas, borderColor: c.border }]}>
                      {accountEmail ? (
                        <View style={styles.accountRow}>
                          <Text style={[styles.accountKey, { color: c.textSecondary }]}>Email</Text>
                          <Text style={[styles.accountValue, { color: c.textPrimary }]}>{accountEmail}</Text>
                        </View>
                      ) : null}
                      {accountPhone ? (
                        <View style={styles.accountRow}>
                          <Text style={[styles.accountKey, { color: c.textSecondary }]}>Mobile</Text>
                          <Text style={[styles.accountValue, { color: c.textPrimary }]}>{formatAuMobile(accountPhone) ?? accountPhone}</Text>
                        </View>
                      ) : null}
                    </View>
                    {!accountEmail ? (
                      <View>
                        <Text style={labelStyle}>Email</Text>
                        <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={inputStyle} accessibilityLabel="Email" />
                      </View>
                    ) : null}
                    {!accountPhone ? phoneField : null}
                    {messageField}
                    {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: submitting, busy: submitting }}
                      disabled={submitting}
                      onPress={submit}
                      style={({ pressed }) => [styles.submit, { backgroundColor: pressed ? c.primaryDark : c.primary }, submitting && { opacity: 0.6 }]}
                    >
                      <Text style={styles.submitText}>{submitting ? 'Sending…' : 'Yep, send my details'}</Text>
                    </Pressable>
                  </View>
                ) : (
                  /* Signed out — plain lead form. */
                  <View style={styles.form}>
                    <View>
                      <Text style={labelStyle}>Name</Text>
                      <TextInput value={name} onChangeText={setName} autoComplete="name" style={inputStyle} accessibilityLabel="Name" />
                    </View>
                    <View>
                      <Text style={labelStyle}>Email</Text>
                      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={inputStyle} accessibilityLabel="Email" />
                    </View>
                    {phoneField}
                    {messageField}
                    {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: submitting, busy: submitting }}
                      disabled={submitting}
                      onPress={submit}
                      style={({ pressed }) => [styles.submit, { backgroundColor: pressed ? c.primaryDark : c.primary }, submitting && { opacity: 0.6 }]}
                    >
                      <Text style={styles.submitText}>{submitting ? 'Sending…' : 'Send'}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 512,
    maxHeight: '85%',
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  scroll: {
    padding: Spacing.xl,
    paddingRight: Spacing['5xl'],
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  sub: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  form: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FontFamily.body,
    fontSize: 14,
    minHeight: 44,
  },
  textarea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 12,
  },
  accountBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  accountKey: {
    width: 56,
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  accountValue: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    fontSize: 14,
  },
  error: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  submit: {
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  submitText: {
    color: '#fff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
});
