/**
 * PaymentGate — renders children only if the current user has an active
 * subscription on the requested side. Otherwise shows an upgrade prompt
 * that deep-links to /subscribe with a recommended tier pre-selected.
 *
 * Use to gate revenue-relevant actions (apply to job, post a job, etc.).
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  isSubscriptionActive,
  useEnterpriseSubscription,
  useTradieSubscription,
} from '@/lib/subscription';
import type { EnterpriseTierKey, TradieTierKey } from '@/lib/pricing-tiers-client';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';

interface Props {
  side: 'tradie' | 'enterprise';
  /** Default tier to pre-select on the upgrade CTA. */
  recommendedTier?: TradieTierKey | EnterpriseTierKey;
  /** Optional headline override for the locked state. */
  lockedHeadline?: string;
  /** Optional body copy override for the locked state. */
  lockedSubtitle?: string;
  /** Render this when no subscription. Defaults to a styled upgrade card. */
  fallback?: ReactNode;
  children: ReactNode;
}

export function PaymentGate({
  side,
  recommendedTier,
  lockedHeadline,
  lockedSubtitle,
  fallback,
  children,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  const tradie = useTradieSubscription();
  const enterprise = useEnterpriseSubscription();
  const state = side === 'tradie' ? tradie : enterprise;

  if (state.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (isSubscriptionActive(state.status)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  // iOS sells nothing in-app (App Store Guideline 3.1.1): show a plain
  // "needs an active subscription" message with no purchase CTA or link.
  const headline = !CAN_SELL_IN_APP
    ? (lockedHeadline ?? (side === 'tradie' ? 'Subscription required' : 'Subscription required'))
    : (lockedHeadline ?? (side === 'tradie' ? 'Subscribe to apply' : 'Subscribe to post jobs'));
  const subtitle = !CAN_SELL_IN_APP
    ? (lockedSubtitle ??
        (side === 'tradie'
          ? 'Applying to jobs needs an active subscription. Once your subscription is active it works here automatically.'
          : 'Posting jobs needs an active subscription. Once your subscription is active it works here automatically.'))
    : (lockedSubtitle ??
        (side === 'tradie'
          ? 'A flat monthly subscription unlocks unlimited job applications, no per-lead fees.'
          : 'Pick a plan to start posting jobs and reaching verified tradies.'));

  const defaultTier =
    recommendedTier ?? (side === 'tradie' ? 'trade' : 'builder');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface : '#fff',
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.tealBg }]}>
        <Ionicons name="lock-closed" size={20} color={colors.teal} />
      </View>
      <Text style={[Type.h3, { color: colors.text }]}>{headline}</Text>
      <Text style={[Type.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
        {subtitle}
      </Text>
      {CAN_SELL_IN_APP ? (
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: colors.teal }]}
          onPress={() =>
            router.push({
              pathname: '/subscribe',
              params: { side, tier: defaultTier, interval: 'monthly' },
            } as any)
          }
        >
          <Text style={styles.ctaText}>See plans</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { padding: Spacing.lg, alignItems: 'center' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  ctaBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
