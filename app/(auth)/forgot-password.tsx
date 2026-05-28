import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { AuthCard } from '@/components/auth/auth-card';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (error) setError(null);
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReset() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (resetError) {
      // Generic copy — avoid leaking whether the address is registered.
      setSent(true);
    } else {
      setSent(true);
    }
  }

  return (
    <AuthCard>
      <Text style={[styles.heading, { color: c.textPrimary }]}>Reset password</Text>

      {sent ? (
        <View style={[styles.successBanner, { borderColor: c.successBorder, backgroundColor: c.successBg }]}>
          <Text style={[styles.successText, { color: c.success }]}>
            If an account exists for {email}, we&apos;ve sent a password reset link. Check your inbox.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.body, { color: c.textSecondary }]}>
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>

          {error ? (
            <View style={[styles.errorBanner, { borderColor: c.error + '33', backgroundColor: c.error + '0D' }]}>
              <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com.au"
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleReset}
            disabled={loading}
            leadingIcon={loading ? <ActivityIndicator color="#fff" size="small" /> : null}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </>
      )}

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: c.textSecondary }]}>Remembered your password?{' '}</Text>
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
  body: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    lineHeight: 22,
    textAlign: 'center',
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
  successBanner: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  successText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
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
});
