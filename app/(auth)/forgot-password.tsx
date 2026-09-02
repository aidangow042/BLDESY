/**
 * /forgot-password — mirrors the website's app/forgot-password/page.tsx.
 *
 * The reset email's link is pointed at the website's scanner-proof
 * `/auth/confirm` interstitial (Outlook SafeLinks GETs every link; that page
 * only spends the token on a tap), which then takes the user to web /settings
 * to set a new password. Unlike the web page we never surface Supabase's
 * error — the success state shows either way so the form can't be used to
 * probe which addresses have an account.
 */
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AuthCard } from '@/components/auth/auth-card';
import { AuthFooterLink } from '@/components/auth/auth-footer-link';
import { FormAlert } from '@/components/auth/form-alert';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES, WEB_BASE } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${WEB_BASE}/auth/confirm?type=recovery`,
      });
    } catch {
      // Enumeration-safe: same outcome whether or not the address is registered.
    }
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard>
        <View style={styles.sent}>
          <View style={[styles.sentIcon, { backgroundColor: c.successBg }]}>
            <Ionicons name="checkmark" size={28} color={c.success} />
          </View>
          <Text accessibilityRole="header" style={[styles.sentTitle, { color: c.textPrimary }]}>
            Check your email
          </Text>
          <Text style={[styles.sentBody, { color: c.textSecondary }]}>
            We sent a password reset link to{' '}
            <Text style={[styles.sentEmail, { color: c.textPrimary }]}>{email.trim()}</Text>. Check your
            inbox and follow the link to reset your password.
          </Text>
          <Pressable
            onPress={() => router.replace(ROUTES.login)}
            hitSlop={6}
            accessibilityRole="link"
            style={styles.backLink}
          >
            <Text style={[styles.backLinkText, { color: c.primary }]}>Back to login</Text>
          </Pressable>
        </View>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      {error ? <FormAlert>{error}</FormAlert> : null}

      <Input
        label="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={submit}
        placeholder="you@example.com.au"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={submit}
        disabled={loading}
        leadingIcon={loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <AuthFooterLink prompt="Remember your password?" linkLabel="Log in" href={ROUTES.login} />
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  sent: {
    alignItems: 'center',
  },
  sentIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  sentTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sentBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
  sentEmail: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  backLink: {
    marginTop: Spacing['2xl'],
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
