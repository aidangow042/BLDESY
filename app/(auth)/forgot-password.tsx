import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.backText, { color: colors.tint }]}>Back</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.heading, { color: colors.text }]}>Reset password</Text>

          {sent ? (
            <View
              style={[
                styles.successCard,
                { backgroundColor: colors.successLight, borderColor: colors.success },
              ]}
            >
              <Text style={[styles.successText, { color: colors.success }]}>
                Check your inbox -- we've sent a password reset link to {email}.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Enter your email and we'll send you a link to reset your password.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.tint },
                  Shadows.md,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send reset link</Text>
                )}
              </Pressable>
            </>
          )}

          <Link href="/(auth)/login" asChild>
            <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={[styles.link, { color: colors.tint }]}>Back to log in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
  },
  back: {
    position: 'absolute',
    top: 64,
    left: Spacing['2xl'],
    zIndex: 1,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  successCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  successText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  button: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
