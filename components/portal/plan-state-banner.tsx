/**
 * Value-gated billing state banners — the two banners the portal shell shows
 * above every page (`~/bldesy-web/app/portal/portal-shell.tsx`, "Value-gated
 * billing state banners"). Copy verbatim; both actions land on /portal/billing.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROUTES } from '@/lib/routes';

/* Tailwind palette values the web banners use (slate-*, orange-*). */
const PAUSED = { border: '#cbd5e1', bg: '#f1f5f9', title: '#1e293b', body: '#475569' };
const PAST_DUE = { border: '#fdba74', bg: '#fff7ed', title: '#9a3412', body: '#c2410c', button: '#ea580c' };

export function PlanStateBanner({ state }: { state: 'paused' | 'past_due' }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  if (state === 'paused') {
    return (
      <View style={[styles.banner, { borderColor: PAUSED.border, backgroundColor: PAUSED.bg }]}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: PAUSED.title }]}>Your profile is paused</Text>
          <Text style={[styles.body, { color: PAUSED.body }]}>
            Hidden from search and new enquiries. Nothing&apos;s deleted — your conversations stay
            open and you can come back any time.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(ROUTES.portalBilling)}
          style={[styles.button, { backgroundColor: c.primary }]}
        >
          <Text style={styles.buttonText}>Reactivate</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { borderColor: PAST_DUE.border, backgroundColor: PAST_DUE.bg }]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: PAST_DUE.title }]}>Your payment didn&apos;t go through</Text>
        <Text style={[styles.body, { color: PAST_DUE.body }]}>
          Your profile stays live while we retry. Update your card to fix it in one go.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(ROUTES.portalBilling)}
        style={[styles.button, { backgroundColor: PAST_DUE.button }]}
      >
        <Text style={styles.buttonText}>Update card</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  copy: {
    gap: 2,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
});
