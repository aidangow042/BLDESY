/**
 * EmailLink — attaches a verified email to a phone-only account. Port of
 * ~/bldesy-web/components/auth/email-link.tsx on top of lib/data/settings.ts
 * (`startEmailChange` → Supabase emails a code, `verifyEmailChange` → writes
 * auth.users.email).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ErrorBanner } from '@/components/jobs/error-banner';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EMAIL_RE, startEmailChange, verifyEmailChange } from '@/lib/data/settings';

type Step = 'email' | 'code' | 'done';

interface EmailLinkProps {
  /** Prefill (e.g. the contact email from a profile). */
  initialEmail?: string;
  /** Called once the email is verified and attached. */
  onLinked?: (email: string) => void;
}

export function EmailLink({ initialEmail = '', onLinked }: EmailLinkProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <View style={[styles.done, { borderColor: c.successBorder, backgroundColor: c.successBg }]}>
        <Ionicons name="checkmark-circle" size={16} color={c.success} />
        <Text style={[styles.doneText, { color: c.success }]}>
          Email verified — receipts and login now work with it.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {error ? <ErrorBanner message={error} /> : null}

      {step === 'email' ? (
        <>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            accessibilityLabel="Email address"
          />
          <Button size="sm" onPress={sendCode} disabled={loading || !EMAIL_RE.test(email.trim())} loading={loading}>
            {loading ? 'Sending…' : 'Verify email'}
          </Button>
        </>
      ) : (
        <>
          <Input
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
            placeholder="••••••"
            keyboardType="number-pad"
            maxLength={8}
            autoComplete="one-time-code"
            autoFocus
            style={styles.codeInput}
            accessibilityLabel="Verification code"
          />
          <View style={styles.row}>
            <Button size="sm" onPress={confirmCode} disabled={loading} loading={loading}>
              {loading ? 'Confirming…' : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              Change email
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  codeInput: { textAlign: 'center', fontSize: 18, letterSpacing: 6 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  doneText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
});
