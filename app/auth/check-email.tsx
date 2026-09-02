/**
 * /auth/check-email — shown after an email signup when Supabase requires the
 * address to be confirmed (user returned, no session). Mirrors the website's
 * app/auth/check-email/page.tsx. The confirmation link lands on the website,
 * so the "redirected back here automatically" line is deliberately omitted.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';

const TIPS = [
  'Check your spam or junk folder',
  'Make sure you typed your email correctly',
  'Wait a minute — emails can take a moment to arrive',
];

export default function CheckEmailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const displayEmail = email && email.length > 0 ? email : 'your email';

  return (
    <View style={[styles.screen, { backgroundColor: c.canvas }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing['3xl'], paddingBottom: insets.bottom + Spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card padding={Spacing['3xl']} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: c.primaryBg }]}>
            <Ionicons name="mail-outline" size={32} color={c.primary} />
          </View>

          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            Check your email
          </Text>

          <Text style={[styles.lead, { color: c.textSecondary }]}>
            We&apos;ve sent a confirmation link to
          </Text>
          <Text selectable style={[styles.email, { color: c.textPrimary }]}>
            {displayEmail}
          </Text>

          <Text style={[styles.body, { color: c.textSecondary }]}>
            Click the link in the email to confirm your account.
          </Text>

          <View style={[styles.tips, { backgroundColor: c.canvas, borderColor: c.border }]}>
            <Text style={[styles.tipsTitle, { color: c.textSecondary }]}>Can&apos;t find it?</Text>
            {TIPS.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <Text style={[styles.tipBullet, { color: c.textSecondary }]}>•</Text>
                <Text style={[styles.tipText, { color: c.textSecondary }]}>{tip}</Text>
              </View>
            ))}
          </View>

          <Button variant="primary" size="lg" fullWidth onPress={() => router.replace(ROUTES.login)}>
            Back to sign in
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  tips: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
    gap: 6,
  },
  tipsTitle: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  tipBullet: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
});
