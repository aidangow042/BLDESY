/**
 * /signup — mirrors the website's app/signup/page.tsx + components/auth/signup-form.tsx:
 * two first-class identities (email, confirmed by link; phone, confirmed by a
 * texted code), one shared clickwrap checkbox that gates every path including
 * the OAuth row, and the login footer.
 *
 * `freshSignup.pending` is set right before each `auth.signUp` so the root
 * layout sends the new account to the one-time /welcome role picker once a
 * session lands. Screens never navigate after a successful sign-in themselves —
 * the only navigation here is to /auth/check-email when the address still
 * needs confirming (no session yet).
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AuthCard } from '@/components/auth/auth-card';
import { AuthFooterLink } from '@/components/auth/auth-footer-link';
import { FormAlert } from '@/components/auth/form-alert';
import { MethodTabs, type AuthMethod } from '@/components/auth/method-tabs';
import { OrDivider } from '@/components/auth/or-divider';
import { PasswordInput } from '@/components/auth/password-input';
import { SocialAuthRow, type SocialAuthResult } from '@/components/auth/social-auth-row';
import { TermsCheckbox } from '@/components/auth/terms-checkbox';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { freshSignup } from '@/lib/auth-context';
import { recordPostSignup } from '@/lib/auth/post-signup';
import { savePendingReferralCode, useReferralCapture } from '@/lib/auth/referral-code';
import { ROUTES, WEB_BASE } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useResendCooldown } from '@/lib/web/hooks/use-resend-cooldown';
import { normaliseE164 } from '@/lib/web/phone';

type PhoneStep = 'details' | 'code';

const NETWORK_ERROR = 'Network error. Please try again.';
const TERMS_REQUIRED = 'You must accept the Terms of Service and Privacy Policy.';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PanelProps {
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
}

export default function SignupScreen() {
  const [method, setMethod] = useState<AuthMethod>('email');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  // Referral share links: `bldesy://signup?ref=BLD-XXXXX` lands here directly;
  // `bldesy://join?ref=…` is picked up by the capture hook. Either way the code
  // is parked for the tradie hand-off (lib/web-onboarding.ts).
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  useReferralCapture();
  useEffect(() => {
    if (ref) savePendingReferralCode(ref);
  }, [ref]);

  function handleSocialStart() {
    setSocialError(null);
    freshSignup.pending = true;
  }

  function handleSocialResult(result: SocialAuthResult) {
    if (result.status === 'success') {
      // OAuth accounts always carry an email, so the website records them as
      // email signups; the terms checkbox was ticked before the button enabled.
      recordPostSignup({ method: 'email' });
      return; // root layout routes to /welcome
    }
    freshSignup.pending = false;
    if (result.status === 'error') setSocialError(result.message);
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Sign up with your email or mobile. One account for homeowners, tradies, and businesses — you'll pick what you're here for next."
    >
      <MethodTabs value={method} onChange={setMethod} />

      {method === 'email' ? (
        <EmailPanel termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} />
      ) : (
        <PhonePanel termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted} />
      )}

      <OrDivider label="or continue with" />

      {socialError ? <FormAlert>{socialError}</FormAlert> : null}
      <SocialAuthRow
        mode="signUp"
        disabled={!termsAccepted}
        onStart={handleSocialStart}
        onResult={handleSocialResult}
      />

      <AuthFooterLink prompt="Already have an account?" linkLabel="Log in" href={ROUTES.login} />
    </AuthCard>
  );
}

/** Email + password; the address is confirmed by link. */
function EmailPanel({ termsAccepted, setTermsAccepted }: PanelProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    if (error) setError(null);
  }

  async function submit() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return setError('Enter your name.');
    if (!EMAIL_PATTERN.test(trimmedEmail)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!termsAccepted) {
      return setError('You must accept the Terms of Service and Privacy Policy to create an account.');
    }

    setLoading(true);
    freshSignup.pending = true;
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { name: trimmedName, full_name: trimmedName },
          emailRedirectTo: `${WEB_BASE}/auth/callback`,
        },
      });

      if (signUpError) {
        // Generic copy — Supabase's raw message can leak "User already registered".
        freshSignup.pending = false;
        setError(
          "Couldn't create your account. If you already have one, try signing in or resetting your password.",
        );
        return;
      }

      // Confirmation required: a user but no session. The flag stays set so the
      // first login after confirming still lands on /welcome.
      if (data.user && !data.session) {
        router.replace(`/auth/check-email?email=${encodeURIComponent(trimmedEmail)}` as Href);
        return;
      }

      // Confirmations off — we already have a session. Root layout routes to /welcome.
      if (data.session) await recordPostSignup({ method: 'email', name: trimmedName });
    } catch {
      freshSignup.pending = false;
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      {error ? <FormAlert>{error}</FormAlert> : null}

      <Input
        label="Name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          clearError();
        }}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        placeholder="Your full name"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearError();
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        placeholder="you@example.com.au"
      />
      <PasswordInput
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clearError();
        }}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        placeholder="At least 8 characters"
      />

      <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={submit}
        disabled={loading || !termsAccepted}
        leadingIcon={loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </Button>
    </View>
  );
}

/** Phone + password; the number is confirmed by a texted code. */
function PhonePanel({ termsAccepted, setTermsAccepted }: PanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [step, setStep] = useState<PhoneStep>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = useResendCooldown(60);

  function clearError() {
    if (error) setError(null);
  }

  async function requestCode() {
    if (!resend.canSend) return;
    setError(null);
    const trimmedName = name.trim();
    const e164 = normaliseE164(phone);
    if (!trimmedName) return setError('Enter your name.');
    if (!e164) return setError('Enter a valid Australian mobile number (e.g. 0412 345 678).');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!termsAccepted) return setError(TERMS_REQUIRED);

    setLoading(true);
    freshSignup.pending = true;
    try {
      // Creates an UNCONFIRMED user and texts the code; re-running it for the
      // same unconfirmed number re-sends the code (the "Resend" path).
      const { error: signUpError } = await supabase.auth.signUp({
        phone: `+${e164}`,
        password,
        options: { data: { name: trimmedName, full_name: trimmedName } },
      });
      if (signUpError) {
        freshSignup.pending = false;
        setError("Couldn't start signup. If this number already has an account, log in instead.");
        return;
      }
      resend.start();
      setStep('code');
    } catch {
      freshSignup.pending = false;
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError(null);
    const token = code.trim();
    if (!/^\d{4,8}$/.test(token)) return setError('Enter the code we sent you.');
    const e164 = normaliseE164(phone);
    if (!e164) return setError('Enter a valid Australian mobile number (e.g. 0412 345 678).');

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+${e164}`,
        token,
        type: 'sms',
      });
      if (verifyError || !data.session) {
        setError('That code is incorrect or has expired.');
        return;
      }
      // Session exists now — the website records the profile row, clickwrap
      // acceptance and funnel event. Root layout routes to /welcome.
      await recordPostSignup({ method: 'phone', name: name.trim() });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      {error ? <FormAlert>{error}</FormAlert> : null}

      {step === 'details' ? (
        <>
          <Input
            label="Name"
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearError();
            }}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            placeholder="Your full name"
          />
          <Input
            label="Mobile number"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              clearError();
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            placeholder="0412 345 678"
          />
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clearError();
            }}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="send"
            onSubmitEditing={requestCode}
            placeholder="At least 8 characters"
          />

          <TermsCheckbox checked={termsAccepted} onChange={setTermsAccepted} />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={requestCode}
            disabled={loading || !termsAccepted || !resend.canSend}
            leadingIcon={loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          >
            {loading ? 'Sending code…' : !resend.canSend ? `Resend in ${resend.secondsLeft}s` : 'Send code'}
          </Button>
        </>
      ) : (
        <>
          <Input
            label="Enter code"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, ''));
              clearError();
            }}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={8}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={verifyCode}
            placeholder="••••••"
            style={styles.codeInput}
            helper={`We texted a code to ${phone.trim() || 'your mobile'}.`}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={verifyCode}
            disabled={loading}
            leadingIcon={loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          >
            {loading ? 'Verifying…' : 'Verify & create account'}
          </Button>

          <Pressable
            onPress={() => {
              setStep('details');
              setCode('');
              setError(null);
            }}
            hitSlop={6}
            accessibilityRole="button"
            style={styles.centreLink}
          >
            <Text style={[styles.link, { color: c.primary }]}>Use a different number</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.lg,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 5,
  },
  centreLink: {
    alignSelf: 'center',
  },
  link: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
