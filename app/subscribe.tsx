/**
 * Tier-aware subscription screen. Mirrors the website's /pricing page
 * (`~/bldesy-web/app/pricing/pricing-page-client.tsx`), adapted for native
 * via Stripe PaymentSheet — SetupIntent + server-side subscribe rather than
 * Embedded Checkout (which is web-only).
 *
 * Route params:
 *   side: 'tradie' | 'enterprise' (defaults to tradie)
 *   tier: TradieTierKey | EnterpriseTierKey (optional pre-select)
 *   interval: 'monthly' | 'annual' (optional pre-select)
 *   pendingJobId: string — required for single-post enterprise checkout
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';

import { AppShell } from '@/components/layout';
import { Badge, Button, Card, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { invalidateSubscriptionCache } from '@/lib/subscription';
import {
  TRADIE_TIERS,
  ENTERPRISE_TIERS,
  annualSavings,
  annualSavingsPercent,
  type BillingInterval,
  type EnterpriseTierKey,
  type TradieTierKey,
} from '@/lib/pricing-tiers-client';

type Side = 'tradie' | 'enterprise';
type TierKey = TradieTierKey | EnterpriseTierKey;

interface CheckoutInitResponse {
  setupIntentClientSecret?: string;
  paymentIntentClientSecret?: string;
  customerId: string;
  ephemeralKeySecret: string;
  mode: 'setup' | 'payment';
}

interface SubscribeResponse {
  subscriptionId: string;
  status: string;
}

export default function SubscribeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { userId } = useUser();
  const params = useLocalSearchParams<{
    side?: string;
    tier?: string;
    interval?: string;
    pendingJobId?: string;
  }>();
  const stripe = useStripe();

  const initialSide: Side = params.side === 'enterprise' ? 'enterprise' : 'tradie';
  const initialInterval: BillingInterval = params.interval === 'annual' ? 'annual' : 'monthly';

  const [side, setSide] = useState<Side>(initialSide);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [selected, setSelected] = useState<TierKey>(() => {
    if (params.tier) return params.tier as TierKey;
    return initialSide === 'tradie' ? 'trade' : 'builder';
  });
  const [processing, setProcessing] = useState(false);

  const tiers = useMemo(() => (side === 'tradie' ? TRADIE_TIERS : ENTERPRISE_TIERS), [side]);

  // Reset selection when switching sides.
  useEffect(() => {
    if (!tiers.find((t) => t.key === selected)) {
      setSelected(side === 'tradie' ? 'trade' : 'builder');
    }
  }, [side, tiers, selected]);

  async function handleSubscribe() {
    if (!userId) {
      toast.show('Sign in required', { variant: 'warning' });
      return;
    }
    if (!stripe) {
      toast.show('Stripe failed to load. Try again.', { variant: 'error' });
      return;
    }

    const isSinglePost = side === 'enterprise' && selected === 'single_post';
    if (isSinglePost && !params.pendingJobId) {
      Alert.alert(
        'Tell us about the job first',
        'Single-post purchases start from the Post a Job flow.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Post a job', onPress: () => router.push('/post-job' as any) },
        ],
      );
      return;
    }

    setProcessing(true);
    try {
      const init = await api.post<CheckoutInitResponse>('/api/stripe/tier-checkout', {
        side,
        tier: selected,
        interval,
        mobile: true,
        ...(params.pendingJobId ? { pendingJobId: params.pendingJobId } : {}),
      });

      const initRes = await stripe.initPaymentSheet({
        merchantDisplayName: 'BLDESY',
        customerId: init.customerId,
        customerEphemeralKeySecret: init.ephemeralKeySecret,
        ...(init.mode === 'payment'
          ? { paymentIntentClientSecret: init.paymentIntentClientSecret! }
          : { setupIntentClientSecret: init.setupIntentClientSecret! }),
        allowsDelayedPaymentMethods: false,
        returnURL: 'bldesy://stripe-redirect',
      });
      if (initRes.error) {
        toast.show(initRes.error.message, { variant: 'error' });
        setProcessing(false);
        return;
      }

      const presentRes = await stripe.presentPaymentSheet();
      if (presentRes.error) {
        if (presentRes.error.code !== 'Canceled') {
          toast.show(presentRes.error.message, { variant: 'error' });
        }
        setProcessing(false);
        return;
      }

      if (init.mode === 'payment') {
        invalidateSubscriptionCache(userId);
        toast.show("Payment received — publishing your job now", { variant: 'success' });
        router.replace('/enterprise-dashboard' as any);
        return;
      }

      // Subscription path — retrieve saved PaymentMethod, hand it to the
      // server to create the recurring subscription.
      const retrieved = await stripe.retrieveSetupIntent(init.setupIntentClientSecret!);
      const paymentMethodId = retrieved.setupIntent?.paymentMethodId;
      if (!paymentMethodId) {
        toast.show('Card was not saved. Try again.', { variant: 'error' });
        setProcessing(false);
        return;
      }

      const sub = await api.post<SubscribeResponse>('/api/stripe/mobile-subscribe', {
        side,
        tier: selected,
        interval,
        paymentMethodId,
      });

      invalidateSubscriptionCache(userId);

      toast.show(
        sub.status === 'active' || sub.status === 'trialing'
          ? "You're subscribed!"
          : 'Subscription queued — live shortly',
        { variant: 'success' },
      );
      router.replace(
        side === 'tradie' ? ('/(tabs)/portal' as any) : ('/enterprise-dashboard' as any),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Try again.';
      toast.show(msg, { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  }

  const selectedTier = tiers.find((t) => t.key === selected);

  return (
    <AppShell title="Pick your plan" showBack>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={[styles.subhead, { color: c.textSecondary }]}>
            Flat subscription. No commission. No pay-per-lead.
          </Text>
        </View>

        {/* Side toggle */}
        <View style={[styles.toggle, { backgroundColor: c.canvas }]}>
          {(['tradie', 'enterprise'] as Side[]).map((s) => {
            const active = side === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSide(s)}
                style={[styles.togglePill, active && { backgroundColor: c.surface, ...Shadows.sm }]}
              >
                <Text
                  style={[
                    styles.togglePillText,
                    { color: active ? c.primary : c.textSecondary },
                  ]}
                >
                  {s === 'tradie' ? 'For tradies' : 'For builders'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Billing interval toggle */}
        <View style={styles.intervalRow}>
          {(['monthly', 'annual'] as BillingInterval[]).map((iv) => {
            const active = interval === iv;
            return (
              <Pressable
                key={iv}
                onPress={() => setInterval(iv)}
                style={[
                  styles.intervalChip,
                  {
                    backgroundColor: active ? c.primaryBg : c.surface,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.intervalChipText,
                    { color: active ? c.primary : c.textSecondary },
                  ]}
                >
                  {iv === 'monthly' ? 'Monthly' : 'Annual · save up to 39%'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tier cards */}
        <View style={styles.tierList}>
          {tiers.map((tier) => {
            const isSelected = selected === tier.key;
            const perPost = (tier as { pricePerPost?: number }).pricePerPost;
            const monthlyPrice = (tier as { monthly?: number }).monthly;
            const annualPrice = (tier as { annual?: number }).annual;
            const tierPrice = perPost ?? (interval === 'monthly' ? monthlyPrice : annualPrice);
            const priceSuffix = perPost ? '/job' : interval === 'monthly' ? '/mo' : '/yr';
            const showSavings =
              !perPost && interval === 'annual' && monthlyPrice && annualPrice;

            return (
              <Pressable key={tier.key} onPress={() => setSelected(tier.key as TierKey)}>
                <Card
                  padding={Spacing.lg}
                  style={[
                    styles.tierCard,
                    isSelected && { borderColor: c.primary, borderWidth: 2 },
                  ]}
                >
                  <View style={styles.tierHeadRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.tierTitleRow}>
                        <Text style={[styles.tierName, { color: c.textPrimary }]}>{tier.name}</Text>
                        {tier.badge ? (
                          <Badge variant="primary">
                            {tier.badge === 'most_popular' ? 'Most popular' : 'Best value'}
                          </Badge>
                        ) : null}
                      </View>
                      <Text style={[styles.tagline, { color: c.textSecondary }]}>{tier.tagline}</Text>
                    </View>
                    <View style={styles.priceCol}>
                      <Text style={[styles.price, { color: c.textPrimary }]}>${tierPrice}</Text>
                      <Text style={[styles.priceSuffix, { color: c.textSecondary }]}>{priceSuffix}</Text>
                    </View>
                  </View>

                  {showSavings && monthlyPrice && annualPrice ? (
                    <Text style={[styles.savings, { color: c.primary }]}>
                      Save ${annualSavings(monthlyPrice, annualPrice)} ({annualSavingsPercent(monthlyPrice, annualPrice)}%) vs monthly
                    </Text>
                  ) : null}

                  <Text style={[styles.bestFor, { color: c.textSecondary }]}>{tier.bestFor}</Text>

                  <View style={styles.featureList}>
                    {tier.features
                      .slice(0, isSelected ? tier.features.length : 4)
                      .map((f) => (
                        <View key={f} style={styles.featureRow}>
                          <Text style={[styles.featureCheck, { color: c.primary }]}>✓</Text>
                          <Text style={[styles.featureText, { color: c.textPrimary }]}>{f}</Text>
                        </View>
                      ))}
                  </View>
                  {!isSelected && tier.features.length > 4 ? (
                    <Text style={[styles.moreLink, { color: c.primary }]}>
                      +{tier.features.length - 4} more features →
                    </Text>
                  ) : null}

                  {tier.competitorNote ? (
                    <View style={[styles.compareBox, { backgroundColor: c.canvas, borderColor: c.border }]}>
                      <Text style={[styles.compareLabel, { color: c.textSecondary }]}>vs the alternatives</Text>
                      <Text style={[styles.compareText, { color: c.textPrimary }]}>{tier.competitorNote}</Text>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </View>

        {selectedTier ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubscribe}
            disabled={processing}
            leadingIcon={processing ? <ActivityIndicator color="#fff" size="small" /> : null}
          >
            {processing
              ? 'Processing…'
              : selectedTier && 'pricePerPost' in selectedTier
                ? `Pay $${selectedTier.pricePerPost}`
                : `Subscribe — ${selectedTier.name}`}
          </Button>
        ) : null}

        <Text style={[styles.fineprint, { color: c.textSecondary }]}>
          Cancel anytime. Auto-renews until cancelled. By subscribing you agree to the BLDESY Terms.
        </Text>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.lg,
  },
  intro: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  subhead: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
    textAlign: 'center',
  },
  toggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  togglePill: {
    flex: 1,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillText: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 13,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  intervalChip: {
    flex: 1,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalChipText: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  tierList: {
    gap: Spacing.md,
  },
  tierCard: {
    gap: Spacing.md,
  },
  tierHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tierName: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceSuffix: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    marginTop: -2,
  },
  savings: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  bestFor: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    lineHeight: 18,
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureCheck: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  moreLink: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  compareBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  compareLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compareText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  fineprint: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.lg,
  },
});
