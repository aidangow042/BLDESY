/**
 * PhoneLink — attaches a verified mobile to the CURRENT account so the user can
 * log in by phone. Port of ~/bldesy-web/components/auth/phone-link.tsx on top
 * of lib/data/settings.ts (`startPhoneChange` → OTP via the send hook,
 * `verifyPhoneChange` → writes auth.users.phone).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ErrorBanner } from '@/components/jobs/error-banner';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startPhoneChange, verifyPhoneChange } from '@/lib/data/settings';
import { isValidAuMobile } from '@/lib/web/phone';

type Step = 'phone' | 'code' | 'done';

interface PhoneLinkProps {
  /** Prefill (e.g. an existing contact number). */
  initialPhone?: string;
  /** True if auth.users already has a confirmed phone — show the confirmed state. */
  alreadyLinked?: boolean;
  /** Called once the number is verified and attached (E.164 digits, no "+"). */
  onLinked?: (phone: string) => void;
  /** Button accent — primary on the web; the customer dashboard passes amber. */
  accent?: string;
}

export function PhoneLink({ initialPhone = '', alreadyLinked = false, onLinked, accent }: PhoneLinkProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [step, setStep] = useState<Step>(alreadyLinked ? 'done' : 'phone');
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError(null);
    setLoading(true);
    try {
      await startPhoneChange(phone);
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
      await verifyPhoneChange(phone, code);
      setStep('done');
      onLinked?.(phone.replace(/\D/g, ''));
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
          Mobile verified — you can now log in with your phone.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {error ? <ErrorBanner message={error} /> : null}

      {step === 'phone' ? (
        <>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder="0412 345 678"
            keyboardType="phone-pad"
            autoComplete="tel"
            accessibilityLabel="Mobile number"
          />
          <Button
            size="sm"
            onPress={sendCode}
            disabled={loading || !isValidAuMobile(phone)}
            loading={loading}
            style={accent ? { backgroundColor: accent, borderRadius: Radius.xl } : undefined}
          >
            {loading ? 'Sending…' : 'Verify for login'}
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
                setStep('phone');
                setCode('');
                setError(null);
              }}
            >
              Change number
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
