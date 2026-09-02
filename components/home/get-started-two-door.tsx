/**
 * GetStartedTwoDoor — ~/bldesy-web/components/home/get-started-two-door.tsx,
 * launch-mode branch: the single tradie door (green), the launch scarcity strip
 * and the homeowner backlink to live search. The tradie count arrives with its
 * display floor already applied — null means "hide the chip", never "show 0".
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FadeIn } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackFunnelEvent } from '@/lib/data/tracking';
import { ROUTES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { LAUNCH_DATE } from '@/lib/web/launch';

interface Props {
  tradieCount: number | null;
}

const TICKS = [
  'Free until 3 homeowners contact you — founding rates locked for good',
  'Verified badge — checked five ways',
  'Jobs in your trade + area, sent to you',
];

/* Tailwind amber-600 / amber-50 — the "Founding offer" pill. */
const AMBER_600 = '#d97706';
const AMBER_50 = '#fffbeb';

export function GetStartedTwoDoor({ tradieCount }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [pending, setPending] = useState(false);

  // Straight into the anon-first wizard — no requirements modal in between.
  async function chooseTradie() {
    if (pending) return;
    trackFunnelEvent('tradie_signup_cta_tapped', { via: 'two_door' });
    setPending(true);
    try {
      await openWebOnboarding('builder');
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {/* The single tradie door */}
      <View style={[styles.door, Shadows.md, { borderColor: c.primary, backgroundColor: c.surface }]}>
        <View style={[styles.doorHeader, { backgroundColor: c.primary }]}>
          <Ionicons name="construct-outline" size={20} color="#fff" />
          <Text style={styles.doorHeaderText}>Solo to big crews</Text>
          <View style={styles.offerPill}>
            <Text style={styles.offerPillText}>Founding offer</Text>
          </View>
        </View>
        <View style={styles.doorBody}>
          <Text accessibilityRole="header" style={[styles.h3, { color: c.textPrimary }]}>
            I&apos;m a tradie
          </Text>
          <Text style={[styles.lead, { color: c.textSecondary }]}>
            Get verified now — your profile is live before launch day.
          </Text>
          <View style={styles.ticks}>
            {TICKS.map((tick) => (
              <View key={tick} style={styles.tickRow}>
                <Ionicons name="checkmark" size={16} color={c.primary} style={styles.tickIcon} />
                <Text style={[styles.tickText, { color: c.textSecondary }]}>{tick}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            {tradieCount !== null ? (
              <FadeIn delay={250}>
                <View style={[styles.countChip, { backgroundColor: c.primaryBg, borderColor: c.primary + '33' }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={c.primary} />
                  <Text style={[styles.countChipText, { color: c.primary }]}>
                    {tradieCount.toLocaleString('en-AU')} founding tradies on board
                  </Text>
                </View>
              </FadeIn>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: pending, busy: pending }}
              disabled={pending}
              onPress={chooseTradie}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: pressed ? c.primaryDark : c.primary },
                pending && { opacity: 0.8 },
              ]}
            >
              {pending ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.ctaText}>Loading…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.ctaText}>Get verified</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </>
              )}
            </Pressable>
            <Text style={[styles.fine, { color: c.textSecondary + 'B3' }]}>$0 to join · takes 5 minutes</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.forTradies as Href)} hitSlop={6}>
              <Text style={[styles.learnMore, { color: c.primary }]}>Learn more about BLDESY for tradies →</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Launch scarcity strip */}
      <View style={[styles.scarcity, { backgroundColor: c.primaryBg }]}>
        <Ionicons name="time-outline" size={16} color={c.primary} />
        <Text style={[styles.scarcityText, { color: c.primary }]}>
          Launching {LAUNCH_DATE} — founding offers end at launch
        </Text>
      </View>

      {/* Homeowner backlink — launch mode means live search. */}
      <Text style={[styles.backlink, { color: c.textSecondary }]}>
        Looking for a tradie?{' '}
        <Text
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.search as Href)}
          style={[styles.backlinkAnchor, { color: c.primary }]}
        >
          Search verified tradies →
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing['3xl'],
  },
  door: {
    borderWidth: 2,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
  },
  doorHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.lg,
  },
  doorHeaderText: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    color: '#ffffff',
  },
  offerPill: {
    borderRadius: Radius.full,
    backgroundColor: AMBER_600,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offerPillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: AMBER_50,
  },
  doorBody: {
    padding: Spacing['2xl'],
  },
  h3: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 30,
  },
  lead: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  ticks: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tickIcon: {
    marginTop: 2,
  },
  tickText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  countChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.xs,
  },
  countChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  cta: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  ctaText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
  fine: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    textAlign: 'center',
  },
  learnMore: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  scarcity: {
    marginTop: Spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  scarcityText: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  backlink: {
    marginTop: Spacing.xl,
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  backlinkAnchor: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
