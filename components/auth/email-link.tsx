/**
 * EmailLink — port of `~/bldesy-web/components/auth/email-link.tsx`.
 *
 * Attaches a verified email to the CURRENT (already authenticated) account —
 * the mirror of PhoneLink for phone-only accounts (anon-onboarding activations
 * land with auth email "" and no way to receive receipts or log in by email):
 *
 *   updateUser({ email })                 → Supabase emails a 6-digit code
 *   verifyOtp({ type: "email_change" })   → confirms + writes auth.users.email
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EMAIL_RE, startEmailChange, verifyEmailChange } from '@/lib/data/settings';

type Step = 'email' | 'code' | 'done';

export function EmailLink({
  initialEmail = '',
  onLinked,
}: {
  /** Prefill (e.g. the contact email from the builder profile). */
  initialEmail?: string;
  /** Called once the email is verified and attached. */
  onLinked?: (email: string) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid = EMAIL_RE.test(email.trim());

  async function sendCode() {
    setError(null);
    setLoading(true);
    try {
      await startEmailChange(email);
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send a code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    setError(null);
    setLoading(true);
    try {
      await verifyEmailChange(email, code);
      setStep('done');
      onLinked?.(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <View style={[styles.done, { borderColor: c.success + '33', backgroundColor: c.success + '0D' }]}>
        <Ionicons name="checkmark-circle" size={16} color={c.success} />
        <Text style={[styles.doneText, { color: c.success }]}>
          Email verified — receipts and login now work with it.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {error ? (
        <View accessibilityRole="alert" style={[styles.error, { borderColor: c.error + '33', backgroundColor: c.error + '0D' }]}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        </View>
      ) : null}

      {step === 'email' ? (
        <>
          <Input
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
            accessibilityLabel="Email address"
          />
          <Pressable
            accessibilityRole="button"
            disabled={loading || !valid}
            onPress={() => void sendCode()}
            style={[styles.button, { backgroundColor: c.primary }, (loading || !valid) && styles.disabled]}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Verify email'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
            placeholder="••••••"
            accessibilityLabel="Verification code"
            autoFocus
            style={styles.codeInput}
          />
          <View style={styles.codeActions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void confirmCode()}
              style={[styles.button, { backgroundColor: c.primary }, loading && styles.disabled]}
            >
              <Text style={styles.buttonText}>{loading ? 'Confirming…' : 'Confirm'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              style={styles.link}
            >
              <Text style={[styles.linkText, { color: c.primary }]}>Change email</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  error: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  button: {
    alignSelf: 'flex-start',
    height: 40,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 6,
  },
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  link: {
    minHeight: 40,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textDecorationLine: 'underline',
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  doneText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
});
