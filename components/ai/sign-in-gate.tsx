/**
 * SignInGate — what a guest sees in place of the AI thread. Mirrors web
 * `components/ai/sign-in-gate.tsx` (copy verbatim): gradient sparkle tile,
 * "AI Assist" heading, one-line pitch, `Sign in to get started` pill.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';

export function SignInGate() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[c.primary, c.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, Shadows.lg]}
      >
        <Ionicons name="sparkles" size={40} color="#ffffff" />
      </LinearGradient>
      <Text accessibilityRole="header" style={[styles.heading, { color: c.textPrimary }]}>
        AI Assist
      </Text>
      <Text style={[styles.body, { color: c.textSecondary }]}>
        Chat with our AI to find the right tradie, get cost estimates, and describe your job.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate(ROUTES.login)}
        style={({ pressed }) => [styles.button, Shadows.md, pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={[c.primary, c.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.buttonText}>Sign in to get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  tile: {
    width: 80,
    height: 80,
    borderRadius: Radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  heading: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 384,
    marginBottom: Spacing['3xl'],
  },
  button: {
    height: 48,
    paddingHorizontal: Spacing['3xl'],
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
  },
});
