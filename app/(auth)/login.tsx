import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';

import { AuthCard } from '@/components/auth/auth-card';
import { AppleSignInButton } from '@/components/auth/apple-sign-in-button';
import { Button, Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear the error banner as soon as the user starts editing.
  useEffect(() => {
    if (error) setError(null);
  }, [email, password]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      // Generic copy — avoid leaking which side (email vs password) was wrong.
      setError('Email or password is incorrect.');
    }
    // On success, root layout listener handles routing.
  }

  return (
    <AuthCard showBack={false}>
      <Text style={[styles.heading, { color: c.textPrimary }]}>Welcome back</Text>

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

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Your password"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleLogin}
        disabled={loading}
        leadingIcon={loading ? <ActivityIndicator color="#fff" size="small" /> : null}
      >
        {loading ? 'Logging in…' : 'Log In'}
      </Button>

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable hitSlop={6}>
          <Text style={[styles.link, { color: c.primary, textAlign: 'center' }]}>Forgot your password?</Text>
        </Pressable>
      </Link>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
        <Text style={[styles.dividerText, { color: c.textSecondary }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
      </View>

      {/* Sign in with Apple (iOS only) */}
      <AppleSignInButton type="signIn" onError={setError} />

      <Pressable
        onPress={() => router.replace('/(tabs)' as any)}
        hitSlop={6}
        accessibilityRole="button"
      >
        <Text style={[styles.subduedLink, { color: c.textSecondary, textAlign: 'center' }]}>
          Browse without an account
        </Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: c.textSecondary }]}>Don&apos;t have an account?{' '}</Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable hitSlop={6}>
            <Text style={[styles.footerLink, { color: c.primary }]}>Sign up</Text>
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
  link: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  subduedLink: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
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
