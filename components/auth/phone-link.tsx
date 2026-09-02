/**
 * PhoneLink — port of `~/bldesy-web/components/auth/phone-link.tsx`.
 *
 * Attaches a verified mobile number to the CURRENT (already authenticated)
 * account so the user can log in by phone afterwards:
 *
 *   updateUser({ phone })               → Supabase texts an OTP via our send hook
 *   verifyOtp({ type: "phone_change" }) → confirms + writes auth.users.phone
 *
 * This is the "link" path (NOT a new login), so it runs unguarded — Supabase
 * enforces its own per-user OTP limits and the caller is authenticated.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startPhoneChange, verifyPhoneChange } from '@/lib/data/settings';
import { isValidAuMobile } from '@/lib/web/phone';

type Step = 'phone' | 'code' | 'done';

export function PhoneLink({
  initialPhone = '',
  alreadyLinked = false,
  onLinked,
}: {
  /** Prefill (e.g. the builder's existing alerts number). */
  initialPhone?: string;
  /** True if auth.users already has a confirmed phone — show a confirmed state. */
  alreadyLinked?: boolean;
  /** Called once the number is verified and attached. */
  onLinked?: (phone: string) => void;
}) {
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
      onLinked?.(phone);
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
          Mobile verified — you can now log in with your phone.
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

      {step === 'phone' ? (
        <>
          <Input
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="0412 345 678"
            accessibilityLabel="Mobile number"
          />
          <Pressable
            accessibilityRole="button"
            disabled={loading || !isValidAuMobile(phone)}
            onPress={() => void sendCode()}
            style={[styles.button, { backgroundColor: c.primary }, (loading || !isValidAuMobile(phone)) && styles.disabled]}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Verify for login'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
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
                setStep('phone');
                setCode('');
                setError(null);
              }}
              style={styles.link}
            >
              <Text style={[styles.linkText, { color: c.primary }]}>Change number</Text>
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
