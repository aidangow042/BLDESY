import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { AuthCard } from '@/components/auth/auth-card';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  // Preserve a deep-link `?role=builder` hint for /welcome after confirm-email.
  const params = useLocalSearchParams<{ role?: string }>();
  const preselectedRole = params.role;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (error) setError(null);
  }, [fullName, email, password]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    setError(null);

    const metadata: Record<string, string> = { full_name: fullName.trim() };
    if (preselectedRole) metadata.preselected_role = preselectedRole;

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: metadata },
    });
    setLoading(false);

    if (authError) {
      // Generic copy — never expose Supabase error strings.
      setError('Could not sign you up. Try a different email or password.');
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <AuthCard showBack={false}>
        <View style={styles.successBlock}>
          <View style={[styles.successBadge, { backgroundColor: c.successBg }]}>
            <Text style={[styles.successCheck, { color: c.success }]}>✓</Text>
          </View>
          <Text style={[styles.heading, { color: c.textPrimary }]}>Check your email</Text>
          <Text style={[styles.successCopy, { color: c.textSecondary }]}>
            We sent a confirmation link to{'\n'}
            <Text style={{ fontFamily: FontFamily.bodyBold, color: c.textPrimary }}>{email}</Text>
            {'\n'}Verify your email to get started.
          </Text>
        </View>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Button variant="primary" size="lg" fullWidth onPress={() => {}}>
              Back to login
            </Button>
          </Pressable>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <Text style={[styles.heading, { color: c.textPrimary }]}>Create your account</Text>
      <Text style={[styles.subhead, { color: c.textSecondary }]}>
        One account for homeowners, tradies, and businesses. You&apos;ll pick what you&apos;re here for after confirming your email.
      </Text>

      {error ? (
        <View style={[styles.errorBanner, { borderColor: c.error + '33', backgroundColor: c.error + '0D' }]}>
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        </View>
      ) : null}

      <Input
        label="Name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        autoCapitalize="words"
        placeholder="Your full name"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com.au"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />

      {/* Terms checkbox */}
      <Pressable
        onPress={() => setTermsAccepted((v) => !v)}
        style={[styles.terms, { borderColor: c.border, backgroundColor: c.surface }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: termsAccepted ? c.primary : c.border,
              backgroundColor: termsAccepted ? c.primary : 'transparent',
            },
          ]}
        >
          {termsAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={[styles.termsText, { color: c.textSecondary }]}>
          I am 18 or over and agree to the BLDESY{' '}
          <Text style={{ color: c.primary, fontFamily: FontFamily.bodyMedium }}>Terms of Service</Text>{' '}
          and{' '}
          <Text style={{ color: c.primary, fontFamily: FontFamily.bodyMedium }}>Privacy Policy</Text>.
        </Text>
      </Pressable>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleSignup}
        disabled={loading || !termsAccepted}
        leadingIcon={loading ? <ActivityIndicator color="#fff" size="small" /> : null}
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </Button>

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: c.textSecondary }]}>Already have an account?{' '}</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={6}>
            <Text style={[styles.footerLink, { color: c.primary }]}>Log in</Text>
          </Pressable>
        </Link>
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  subhead: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  terms: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    lineHeight: 12,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  successBlock: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    fontSize: 28,
    fontFamily: FontFamily.bodyBold,
  },
  successCopy: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
});
