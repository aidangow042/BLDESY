/**
 * Billing screen — reads subscription state from the website's
 * /api/stripe/billing-details or /api/stripe/enterprise-subscription-state.
 *
 * Actions:
 *  - Update card  → PaymentSheet over a SetupIntent from /api/stripe/setup-intent
 *  - Change plan  → in-app sheet → /api/stripe/swap-plan (tradie) or
 *                   /api/stripe/enterprise-swap-tier (enterprise)
 *  - Cancel       → POST /api/stripe/cancel-subscription (soft)
 *  - Resume       → POST /api/stripe/resume-subscription
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';

import { AppShell } from '@/components/layout';
import { Badge, Button, Card, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api, ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import {
  invalidateSubscriptionCache,
  useEnterpriseSubscription,
  useTradieSubscription,
  type SubscriptionState,
} from '@/lib/subscription';
import {
  ENTERPRISE_TIERS,
  tradieTier,
  enterpriseTier,
  type BillingInterval,
} from '@/lib/pricing-tiers-client';

type Side = 'tradie' | 'enterprise';

function formatDate(unix: number | null): string {
  if (!unix) return '—';
  return new Date(unix * 1000).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(cents: number, currency: string): string {
  const dollars = (cents / 100).toFixed(2);
  return `${currency.toUpperCase() === 'AUD' ? 'A$' : '$'}${dollars}`;
}

export default function BillingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { userId } = useUser();
  const stripe = useStripe();

  const tradie = useTradieSubscription();
  const enterprise = useEnterpriseSubscription();

  const side: Side = tradie.status ? 'tradie' : enterprise.status ? 'enterprise' : 'tradie';
  const state: SubscriptionState = side === 'tradie' ? tradie : enterprise;
  const loading = tradie.loading || enterprise.loading;

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planModalVisible, setPlanModalVisible] = useState(false);

  const refresh = useCallback(() => {
    if (side === 'tradie') tradie.refresh();
    else enterprise.refresh();
  }, [side, tradie, enterprise]);

  const tierDetails =
    state.tier && side === 'tradie'
      ? tradieTier(state.tier as any)
      : state.tier && side === 'enterprise' && state.tier !== 'single_post'
        ? enterpriseTier(state.tier as any)
        : null;

  async function handleUpdateCard() {
    if (!stripe) return;
    setActionLoading('update-card');
    try {
      const setup = await api.post<{
        clientSecret: string;
        customerId?: string;
        ephemeralKeySecret?: string;
      }>('/api/stripe/setup-intent');
      if (!setup.clientSecret) {
        toast.show('Stripe did not return a setup secret', { variant: 'error' });
        return;
      }
      const initRes = await stripe.initPaymentSheet({
        merchantDisplayName: 'BLDESY',
        setupIntentClientSecret: setup.clientSecret,
        ...(setup.customerId && setup.ephemeralKeySecret
          ? {
              customerId: setup.customerId,
              customerEphemeralKeySecret: setup.ephemeralKeySecret,
            }
          : {}),
        allowsDelayedPaymentMethods: false,
        returnURL: 'bldesy://stripe-redirect',
      });
      if (initRes.error) {
        toast.show(initRes.error.message, { variant: 'error' });
        return;
      }
      const present = await stripe.presentPaymentSheet();
      if (present.error) {
        if (present.error.code !== 'Canceled') {
          toast.show(present.error.message, { variant: 'error' });
        }
        return;
      }

      const retrieved = await stripe.retrieveSetupIntent(setup.clientSecret);
      const paymentMethodId = retrieved.setupIntent?.paymentMethodId;
      if (paymentMethodId) {
        try {
          await api.post('/api/stripe/setup-intent', { paymentMethodId });
        } catch {
          // Stripe already saved the card; promoting it to default is best-effort.
        }
      }

      invalidateSubscriptionCache(userId ?? undefined);
      refresh();
      toast.show('Card updated', { variant: 'success' });
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Try again later', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  function confirmCancel() {
    Alert.alert(
      'Cancel subscription?',
      `You'll keep access until ${formatDate(state.currentPeriodEnd)}. You can resume any time before then.`,
      [
        { text: 'Keep subscription', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: handleCancel },
      ],
    );
  }

  async function handleCancel() {
    setActionLoading('cancel');
    try {
      const endpoint =
        side === 'tradie' ? '/api/stripe/cancel-subscription' : '/api/stripe/enterprise-cancel';
      await api.post(endpoint);
      invalidateSubscriptionCache(userId ?? undefined);
      refresh();
      toast.show('Subscription will end on ' + formatDate(state.currentPeriodEnd), { variant: 'success' });
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Try again later', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResume() {
    setActionLoading('resume');
    try {
      const endpoint =
        side === 'tradie' ? '/api/stripe/resume-subscription' : '/api/stripe/enterprise-resume';
      await api.post(endpoint);
      invalidateSubscriptionCache(userId ?? undefined);
      refresh();
      toast.show('Subscription resumed', { variant: 'success' });
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Try again later', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePlanChange(target: BillingInterval | string) {
    setActionLoading('swap');
    try {
      if (side === 'tradie') {
        await api.post('/api/stripe/swap-plan', { plan: target });
      } else {
        await api.post('/api/stripe/enterprise-swap-tier', {
          tier: target,
          interval: state.interval ?? 'monthly',
        });
      }
      invalidateSubscriptionCache(userId ?? undefined);
      refresh();
      setPlanModalVisible(false);
      toast.show('Plan changed', { variant: 'success' });
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : 'Try again later', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  /* ── Render: empty state ────────────────────────────────────── */

  if (!loading && !state.status) {
    return (
      <AppShell title="Billing" showBack>
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: c.primaryBg }]}>
            <Text style={[styles.emptyGlyph, { color: c.primary }]}>💳</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No active subscription</Text>
          <Text style={[styles.emptyCopy, { color: c.textSecondary }]}>
            {CAN_SELL_IN_APP
              ? 'Pick a plan to unlock applications, dashboard analytics and verified badges.'
              : 'A subscription unlocks applications, dashboard analytics and verified badges. Subscriptions are managed on the web — once active, your plan works here automatically.'}
          </Text>
          {CAN_SELL_IN_APP ? (
            <Button variant="primary" size="lg" onPress={() => router.push('/subscribe' as any)}>
              See plans
            </Button>
          ) : null}
        </View>
      </AppShell>
    );
  }

  /* ── Render: active sub ─────────────────────────────────────── */

  return (
    <AppShell title="Billing" showBack>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            {/* Current plan card */}
            <Card padding={Spacing.lg} style={{ gap: Spacing.md }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>CURRENT PLAN</Text>
              <View style={styles.planHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, { color: c.textPrimary }]}>
                    {tierDetails ? tierDetails.name : 'Subscription'}
                  </Text>
                  <Text style={[styles.planSub, { color: c.textSecondary }]}>
                    {state.interval === 'annual' ? 'Annual' : 'Monthly'} billing · {state.status ?? 'unknown'}
                  </Text>
                </View>
                {tierDetails ? (
                  <View style={styles.priceCol}>
                    <Text style={[styles.price, { color: c.textPrimary }]}>
                      ${state.interval === 'annual'
                        ? (tierDetails as any).annual ?? '—'
                        : (tierDetails as any).monthly ?? '—'}
                    </Text>
                    <Text style={[styles.priceSuffix, { color: c.textSecondary }]}>
                      /{state.interval === 'annual' ? 'yr' : 'mo'}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: c.textSecondary }]}>
                  {state.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                </Text>
                <Text style={[styles.metaValue, { color: c.textPrimary }]}>
                  {formatDate(state.currentPeriodEnd)}
                </Text>
              </View>

              {state.cancelAtPeriodEnd ? (
                <Badge variant="warning">Cancelling soon</Badge>
              ) : null}

              <View style={styles.actionsRow}>
                {CAN_SELL_IN_APP ? (
                  <Button
                    variant="secondary"
                    size="md"
                    onPress={() => setPlanModalVisible(true)}
                    disabled={actionLoading === 'swap'}
                  >
                    Change plan
                  </Button>
                ) : null}
                {state.cancelAtPeriodEnd ? (
                  <Button
                    variant="primary"
                    size="md"
                    onPress={handleResume}
                    disabled={actionLoading === 'resume'}
                    leadingIcon={actionLoading === 'resume' ? <ActivityIndicator color="#fff" size="small" /> : null}
                  >
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="md"
                    onPress={confirmCancel}
                    disabled={actionLoading === 'cancel'}
                    leadingIcon={actionLoading === 'cancel' ? <ActivityIndicator color={c.error} size="small" /> : null}
                  >
                    Cancel
                  </Button>
                )}
              </View>
            </Card>

            {/* Payment method */}
            <Card padding={Spacing.lg} style={{ gap: Spacing.md }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>PAYMENT METHOD</Text>
              {state.paymentMethod ? (
                <View style={styles.pmRow}>
                  <View style={[styles.brandChip, { backgroundColor: c.primaryBg }]}>
                    <Text style={[styles.brandChipText, { color: c.primary }]}>
                      {state.paymentMethod.brand.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pmLast4, { color: c.textPrimary }]}>•••• {state.paymentMethod.last4}</Text>
                    <Text style={[styles.pmExp, { color: c.textSecondary }]}>
                      Expires {String(state.paymentMethod.exp_month).padStart(2, '0')}/{state.paymentMethod.exp_year}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.empty, { color: c.textSecondary }]}>No payment method on file.</Text>
              )}
              {CAN_SELL_IN_APP ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleUpdateCard}
                  disabled={actionLoading === 'update-card'}
                  leadingIcon={actionLoading === 'update-card' ? <ActivityIndicator color={c.primary} size="small" /> : null}
                >
                  Update card
                </Button>
              ) : null}
            </Card>

            {/* Invoices */}
            {state.invoices.length > 0 ? (
              <Card padding={Spacing.lg} style={{ gap: Spacing.sm }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>RECENT INVOICES</Text>
                {state.invoices.map((inv, idx) => (
                  <Pressable
                    key={`${inv.date}-${idx}`}
                    onPress={() => inv.invoice_url && Linking.openURL(inv.invoice_url)}
                    style={({ pressed }) => [
                      styles.invRow,
                      idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderLight },
                      pressed && inv.invoice_url && { backgroundColor: c.canvas },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.invDate, { color: c.textPrimary }]}>{formatDate(inv.date)}</Text>
                      <Text style={[styles.invStatus, { color: c.textSecondary }]}>{inv.status}</Text>
                    </View>
                    <Text style={[styles.invAmount, { color: c.textPrimary }]}>
                      {formatAmount(inv.amount, inv.currency)}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Plan change modal */}
      <Modal
        visible={planModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPlanModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Change plan</Text>
            <Text style={[styles.modalCopy, { color: c.textSecondary }]}>
              {side === 'tradie'
                ? 'Switch your billing interval. Stripe handles the proration automatically.'
                : 'Switch between Builder and Contractor tiers. Stripe handles the proration.'}
            </Text>
            <View style={styles.modalChoices}>
              {side === 'tradie'
                ? (['monthly', 'annual'] as BillingInterval[]).map((iv) => {
                    const active = state.interval === iv;
                    return (
                      <Pressable
                        key={iv}
                        onPress={() => !active && handlePlanChange(iv)}
                        disabled={active || actionLoading === 'swap'}
                        style={[
                          styles.modalChoice,
                          {
                            backgroundColor: active ? c.primaryBg : c.canvas,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text style={[styles.modalChoiceTitle, { color: c.textPrimary }]}>
                          {iv === 'monthly' ? 'Monthly billing' : 'Annual billing'}
                        </Text>
                        <Text style={[styles.modalChoiceMeta, { color: active ? c.primary : c.textSecondary }]}>
                          {active ? 'Current' : 'Switch'}
                        </Text>
                      </Pressable>
                    );
                  })
                : (['builder', 'contractor'] as const).map((tier) => {
                    const active = state.tier === tier;
                    const meta = ENTERPRISE_TIERS.find((t) => t.key === tier);
                    return (
                      <Pressable
                        key={tier}
                        onPress={() => !active && handlePlanChange(tier)}
                        disabled={active || actionLoading === 'swap'}
                        style={[
                          styles.modalChoice,
                          {
                            backgroundColor: active ? c.primaryBg : c.canvas,
                            borderColor: active ? c.primary : c.border,
                          },
                        ]}
                      >
                        <Text style={[styles.modalChoiceTitle, { color: c.textPrimary }]}>{meta?.name}</Text>
                        <Text style={[styles.modalChoiceMeta, { color: active ? c.primary : c.textSecondary }]}>
                          {active ? 'Current' : `$${meta?.monthly}/mo`}
                        </Text>
                      </Pressable>
                    );
                  })}
            </View>
            <View style={styles.modalFooter}>
              <Button variant="ghost" onPress={() => setPlanModalVisible(false)}>
                Close
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.lg,
  },
  loadingWrap: {
    paddingVertical: Spacing['4xl'],
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyGlyph: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  planName: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  planSub: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceSuffix: {
    fontSize: 11,
    fontFamily: FontFamily.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  pmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  brandChipText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  pmLast4: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  pmExp: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  empty: {
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  invDate: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  invStatus: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    textTransform: 'capitalize',
  },
  invAmount: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  modalCopy: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    lineHeight: 20,
  },
  modalChoices: {
    gap: Spacing.sm,
  },
  modalChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalChoiceTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  modalChoiceMeta: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
