/**
 * /login — mirrors the website's app/login/page.tsx + components/auth/login-form.tsx:
 * two doors into the same account (email-or-mobile + password, or a texted
 * one-time code), then the OAuth row, "Browse without an account" and the
 * signup footer. Successful sign-ins never navigate here — the root layout's
 * post-auth routing decides where the user lands.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AuthCard } from '@/components/auth/auth-card';
import { AuthFooterLink } from '@/components/auth/auth-footer-link';
import { FormAlert } from '@/components/auth/form-alert';
import { MethodTabs, type AuthMethod } from '@/components/auth/method-tabs';
import { OrDivider } from '@/components/auth/or-divider';
import { PasswordInput } from '@/components/auth/password-input';
import { SocialAuthRow, type SocialAuthResult } from '@/components/auth/social-auth-row';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { freshSignup } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { useResendCooldown } from '@/lib/web/hooks/use-resend-cooldown';
import { normaliseE164 } from '@/lib/web/phone';

type PhoneStep = 'phone' | 'code';

const NETWORK_ERROR = 'Network error. Please try again.';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [method, setMethod] = useState<AuthMethod>('email');
  const [socialError, setSocialError] = useState<string | null>(null);

  function handleSocialResult(result: SocialAuthResult) {
    if (result.status !== 'success') freshSignup.pending = false;
    if (result.status === 'error') setSocialError(result.message);
    // success → root layout routes; cancelled → nothing to do
  }

  return (
    <AuthCard showBack={false} title="Welcome back">
      <MethodTabs value={method} onChange={setMethod} />

      {method === 'email' ? <EmailPanel /> : <PhonePanel />}

      <OrDivider label="or" />

      {socialError ? <FormAlert>{socialError}</FormAlert> : null}
      {/* Web parity: OAuth sign-ins run through the auth callback, which sends a role-less
          account to /welcome (ensureProfileAndResolveDest) — even from the login page. */}
      <SocialAuthRow
        mode="signIn"
        onStart={() => {
          setSocialError(null);
          freshSignup.pending = true;
        }}
        onResult={handleSocialResult}
      />

      <Pressable
        onPress={() => router.replace(ROUTES.home)}
        hitSlop={6}
        accessibilityRole="link"
        style={styles.browse}
      >
        <Text style={[styles.browseText, { color: c.textSecondary }]}>Browse without an account</Text>
      </Pressable>

      <AuthFooterLink prompt="Don't have an account?" linkLabel="Sign up" href={ROUTES.signup} />
    </AuthCard>
  );
}

/** Email-or-mobile + password. */
function EmailPanel() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const id = identifier.trim();
    if (!id || !password) {
      setError('Email/mobile and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // If the identifier parses as an AU mobile, log in by phone; otherwise email.
      const e164 = normaliseE164(id);
      const { error: authError } = await supabase.auth.signInWithPassword(
        e164 ? { phone: `+${e164}`, password } : { email: id, password },
      );
      if (authError) {
        // Generic copy — never echo which side (identifier vs password) was wrong.
        setError('Email/mobile or password is incorrect.');
      }
      // Success: the root layout routes.
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      {error ? <FormAlert>{error}</FormAlert> : null}

      <Input
        label="Email or mobile"
        value={identifier}
        onChangeText={(v) => {
          setIdentifier(v);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
        placeholder="you@example.com.au or 0412 345 678"
      />

      <PasswordInput
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        placeholder="Your password"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={submit}
        disabled={loading}
        leadingIcon={loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
      >
        {loading ? 'Logging in…' : 'Log In'}
      </Button>

      <Pressable
        onPress={() => router.push(ROUTES.forgotPassword)}
        hitSlop={6}
        accessibilityRole="link"
        style={styles.centreLink}
      >
        <Text style={[styles.link, { color: c.primary }]}>Forgot your password?</Text>
      </Pressable>
    </View>
  );
}

/**
 * Phone OTP. Only ever succeeds for a number already linked to an account
 * (`shouldCreateUser: false`), and the screen advances to the code step no
 * matter what the request returned so it never reveals whether a number is
 * registered — the same enumeration defence as the website's request route.
 */
function PhonePanel() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [step, setStep] = useState<PhoneStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resend = useResendCooldown(60);

  async function requestCode() {
    if (!resend.canSend) return;
    setError(null);
    const e164 = normaliseE164(phone);
    if (!e164) {
      setError('Enter a valid Australian mobile number (e.g. 0412 345 678).');
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+${e164}`,
        options: { shouldCreateUser: false },
      });
      if (otpError && (otpError.status === 429 || otpError.code === 'over_sms_send_rate_limit')) {
        setError('Too many code requests. Please wait a few minutes and try again.');
        return;
      }
      // Any other outcome — including "signups not allowed" for an unregistered
      // number — advances, so the response never reveals account existence.
      resend.start();
      setStep('code');
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError(null);
    const token = code.trim();
    if (!/^\d{4,8}$/.test(token)) {
      setError('Enter the code we sent you.');
      return;
    }
    const e164 = normaliseE164(phone);
    if (!e164) {
      setError('Enter a valid Australian mobile number (e.g. 0412 345 678).');
      return;
    }
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+${e164}`,
        token,
        type: 'sms',
      });
      if (verifyError || !data.session) {
        setError('That code is incorrect or has expired.');
      }
      // Success: the root layout routes.
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.panel}>
      {error ? <FormAlert>{error}</FormAlert> : null}

      {step === 'phone' ? (
        <>
          <Input
            label="Mobile number"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (error) setError(null);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="send"
            onSubmitEditing={requestCode}
            placeholder="0412 345 678"
            helper="We'll text you a one-time code. Phone login works once you've added a mobile to your account."
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={requestCode}
            disabled={loading || !resend.canSend}
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
              if (error) setError(null);
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
            helper={`If ${phone.trim() || 'that number'} has an account, a code is on its way.`}
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={verifyCode}
            disabled={loading}
            leadingIcon={loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          >
            {loading ? 'Verifying…' : 'Verify & log in'}
          </Button>

          <Pressable
            onPress={() => {
              setStep('phone');
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
  browse: {
    alignSelf: 'center',
  },
  browseText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textAlign: 'center',
  },
});
