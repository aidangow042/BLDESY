/**
 * /enterprise/billing — Billing & Plans, READ-ONLY. Port of
 * ~/bldesy-web/app/enterprise/billing/page.tsx minus every purchase path:
 * plan state + status, "Next payment on" / "Access until", the Builder posts
 * meter (postsUsedPercent), cancel / resume (allowed everywhere), the card on
 * file, the billing cycle and the payment history.
 *
 * iOS sells nothing (CLAUDE.md §6): prices, the Builder ↔ Contractor swap and
 * "$99/post" are gated behind CAN_SELL_IN_APP. Neither platform starts a new
 * subscription here — the no-subscription state says "Manage your plan on the
 * web at bldesy.com.au" as plain text (never a link).
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useEnterprise } from '@/components/enterprise/enterprise-context';
import {
  Divider,
  HubModal,
  HubScreen,
  PageTitle,
  PillButton,
  SectionCard,
  Spinner,
  TinyPill,
  useHubTheme,
} from '@/components/enterprise/hub-primitives';
import { useToast } from '@/components/ui';
import { FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { cancelEnterprise, resumeEnterprise, swapEnterpriseTier } from '@/lib/data/billing';
import {
  getEnterpriseBilling,
  getEnterpriseSubscriptionState,
  postsUsedPercent,
  type EnterpriseBilling,
  type EnterpriseSubscriptionState,
} from '@/lib/data/enterprise';
import {
  BILLING_COPY,
  cancelUntilLabel,
  cardExpiryLabel,
  enterprisePlanPerks,
  formatIsoDateLong,
  formatPaymentAmount,
  MANAGE_ON_WEB_COPY,
  paymentDescription,
  paymentStatusLabel,
  paymentStatusTone,
  periodEndLabel,
  tierDisplayName,
  tierPrice,
  tierSwapPreview,
  type EnterpriseTierChoice,
} from '@/lib/enterprise-hub/billing';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';

export default function EnterpriseBillingScreen() {
  const c = useHubTheme();
  const toast = useToast();
  const { profile } = useEnterprise();

  const [billing, setBilling] = useState<EnterpriseBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<EnterpriseTierChoice | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const profileId = profile?.id ?? null;

  const load = useCallback(async () => {
    if (!profileId) return;
    try {
      setBilling(await getEnterpriseBilling(profileId));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Couldn't load billing details.", { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [profileId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const refreshStripeState = useCallback(async () => {
    try {
      const state: EnterpriseSubscriptionState = await getEnterpriseSubscriptionState();
      setBilling((prev) => (prev ? { ...prev, stripeState: state } : prev));
    } catch {
      // Non-fatal — the page still renders with DB-only data.
    }
  }, []);

  async function handleCancel() {
    if (!billing?.subscription) return;
    setCancelling(true);
    try {
      await cancelEnterprise();
      setShowCancel(false);
      toast.show(BILLING_COPY.cancelledOk, { variant: 'success' });
      await refreshStripeState();
    } catch (e) {
      toast.show(e instanceof ApiError ? BILLING_COPY.cancelFailed : BILLING_COPY.cancelError, { variant: 'error' });
    } finally {
      setCancelling(false);
    }
  }

  async function handleResume() {
    if (!billing?.subscription) return;
    setResuming(true);
    try {
      await resumeEnterprise();
      toast.show(BILLING_COPY.resumedOk, { variant: 'success' });
      await refreshStripeState();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || BILLING_COPY.resumeFailed : BILLING_COPY.networkError, {
        variant: 'error',
      });
    } finally {
      setResuming(false);
    }
  }

  async function confirmTierSwap(tier: EnterpriseTierChoice) {
    if (!CAN_SELL_IN_APP || !profileId) return;
    setUpgrading(true);
    try {
      const res = await swapEnterpriseTier(tier, 'monthly');
      toast.show(res.message ?? BILLING_COPY.swapOk, { variant: 'success' });
      setUpgradeTarget(null);
      await load();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || BILLING_COPY.swapFailed : BILLING_COPY.networkError, {
        variant: 'error',
      });
    } finally {
      setUpgrading(false);
    }
  }

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Spinner minHeight={320} />
      </View>
    );
  }

  const subscription = billing?.subscription ?? null;
  const stripeSub = billing?.stripeState?.subscription ?? null;
  const paymentMethod = billing?.stripeState?.paymentMethod ?? null;
  const payments = billing?.payments ?? [];
  const cancellingAtPeriodEnd = !!stripeSub?.cancel_at_period_end;
  const perks = enterprisePlanPerks(subscription?.plan);
  const periodEnd = periodEndLabel(stripeSub?.current_period_end, subscription?.current_period_end);
  const pctUsed = subscription ? postsUsedPercent(subscription) : 0;
  const swap = upgradeTarget ? tierSwapPreview(subscription?.plan ?? null, upgradeTarget) : null;

  return (
    <HubScreen refreshing={refreshing} onRefresh={onRefresh} gap={Spacing['3xl']}>
      <PageTitle title={BILLING_COPY.title} subtitle={BILLING_COPY.subtitle} />

      {subscription ? (
        <>
          {/* Cancellation banner — shown when the sub is scheduled to terminate at period end */}
          {cancellingAtPeriodEnd ? (
            <View style={[styles.cancelBanner, { borderColor: c.warning + '4D', backgroundColor: c.warning + '0D' }]}>
              <View style={styles.cancelBannerRow}>
                <Ionicons name="alert-circle-outline" size={20} color={c.warning} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cancelBannerTitle, { color: c.textPrimary }]}>
                    Subscription will end on {formatStripe(stripeSub?.cancel_at) ?? 'period end'}
                  </Text>
                  <Text style={[styles.cancelBannerBody, { color: c.textSecondary }]}>
                    You&apos;ll keep full access until then. Resume any time before that date.
                  </Text>
                </View>
              </View>
              <PillButton
                label={resuming ? 'Resuming…' : 'Resume subscription'}
                variant="success"
                size="sm"
                onPress={handleResume}
                loading={resuming}
              />
            </View>
          ) : null}

          {/* Current plan */}
          <LinearGradient
            colors={[c.indigo, c.indigo, c.indigo + 'E6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, Shadows.md]}
          >
            <View pointerEvents="none" style={styles.blobTopRight} />
            <View pointerEvents="none" style={styles.blobBottomLeft} />
            <View style={styles.heroTitleRow}>
              <Text accessibilityRole="header" style={styles.heroTitle}>
                {tierDisplayName(subscription.plan)} Plan
              </Text>
              <View style={[styles.heroStatus, { backgroundColor: cancellingAtPeriodEnd ? c.warning + '4D' : 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.heroStatusLabel}>{cancellingAtPeriodEnd ? 'Cancelling' : 'Active'}</Text>
              </View>
            </View>

            {/* Price — never on iOS */}
            {CAN_SELL_IN_APP ? (
              <View style={styles.priceRow}>
                <Text style={styles.price}>${tierPrice(subscription.plan)}</Text>
                <Text style={styles.priceUnit}>/month</Text>
              </View>
            ) : null}

            {/* Next-payment / access-until line */}
            {periodEnd ? (
              <Text style={styles.heroLine}>
                {cancellingAtPeriodEnd ? 'Access until ' : 'Next payment on '}
                <Text style={styles.heroLineStrong}>{periodEnd}</Text>
              </Text>
            ) : null}

            {/* Posts usage (starter only) */}
            {subscription.plan === 'starter' && subscription.posts_limit ? (
              <View style={styles.meter}>
                <View style={styles.meterLabels}>
                  <Text style={styles.meterLabel}>Job posts used this cycle</Text>
                  <Text style={styles.meterValue}>
                    {subscription.posts_used_this_cycle}/{subscription.posts_limit}
                  </Text>
                </View>
                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${pctUsed}%` }]} />
                </View>
              </View>
            ) : null}

            {/* Action buttons */}
            <View style={styles.heroActions}>
              {CAN_SELL_IN_APP && subscription.plan === 'starter' && !cancellingAtPeriodEnd ? (
                <PillButton label="Upgrade to Contractor" variant="white" size="sm" onPress={() => setUpgradeTarget('contractor')} />
              ) : null}
              {!cancellingAtPeriodEnd ? (
                <PillButton label="Cancel plan" variant="outline-white" size="sm" onPress={() => setShowCancel(true)} />
              ) : null}
            </View>

            {/* Perks list */}
            {perks.length > 0 ? (
              <View style={styles.perks}>
                {perks.slice(0, 6).map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </LinearGradient>

          {/* Payment method & Billing cycle */}
          <SectionCard>
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Payment Method</Text>
            {paymentMethod ? (
              <View style={styles.cardRow}>
                <View style={[styles.cardBrand, { backgroundColor: c.canvas, borderColor: c.border }]}>
                  <Ionicons name="card-outline" size={20} color={c.indigo} />
                </View>
                <View>
                  <Text style={[styles.cardMain, { color: c.textPrimary }]}>
                    {capitaliseBrand(paymentMethod.brand)} ending in {paymentMethod.last4}
                  </Text>
                  <Text style={[styles.cardSub, { color: c.textSecondary }]}>
                    {cardExpiryLabel(paymentMethod.exp_month, paymentMethod.exp_year)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.cardRow}>
                <View style={[styles.cardBrand, { backgroundColor: c.canvas, borderColor: c.border }]}>
                  <Ionicons name="card-outline" size={20} color={c.textSecondary + '66'} />
                </View>
                <Text style={[styles.cardSub, { color: c.textSecondary }]}>{BILLING_COPY.noCard}</Text>
              </View>
            )}
          </SectionCard>

          <SectionCard>
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Billing Cycle</Text>
            <View style={styles.cardRow}>
              <View style={[styles.cycleIcon, { backgroundColor: c.indigo + '1A' }]}>
                <Ionicons name="refresh-outline" size={20} color={c.indigo} />
              </View>
              <View>
                <Text style={[styles.cardMain, { color: c.textPrimary }]}>Billed monthly</Text>
                <Text style={[styles.cardSub, { color: c.textSecondary }]}>
                  Renews every month{cancellingAtPeriodEnd ? ' (auto-renew off)' : ''}
                </Text>
              </View>
            </View>
          </SectionCard>
        </>
      ) : (
        <SectionCard>
          <View style={styles.noSubRow}>
            <View style={[styles.cardBrand, { backgroundColor: c.canvas, borderColor: c.border }]}>
              <Ionicons name="card-outline" size={20} color={c.textSecondary} />
            </View>
            <Text style={[styles.noSubText, { color: c.textPrimary }]}>{MANAGE_ON_WEB_COPY}</Text>
          </View>
        </SectionCard>
      )}

      {/* Payment history */}
      <SectionCard title="Payment History" padding={0}>
        {payments.length === 0 ? (
          <Text style={[styles.noPayments, { color: c.textSecondary }]}>{BILLING_COPY.noPayments}</Text>
        ) : (
          payments.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.paymentRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.paymentDesc, { color: c.textPrimary }]}>{paymentDescription(p.type)}</Text>
                  <Text style={[styles.paymentDate, { color: c.textSecondary }]}>{formatIsoDateLong(p.created_at)}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={[styles.paymentAmount, { color: c.textPrimary }]}>{formatPaymentAmount(p.amount)}</Text>
                  <TinyPill label={paymentStatusLabel(p.status)} tone={paymentStatusTone(p.status)} size="xxs" />
                </View>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      {/* Cancel modal */}
      <HubModal visible={showCancel} onClose={() => !cancelling && setShowCancel(false)} accessibilityLabel="Cancel subscription?">
        <Text accessibilityRole="header" style={[styles.modalTitle, { color: c.textPrimary }]}>
          Cancel subscription?
        </Text>
        <Text style={[styles.modalBody, { color: c.textSecondary }]}>
          Your plan stays active until{' '}
          <Text style={{ color: c.textPrimary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}>
            {cancelUntilLabel(stripeSub?.current_period_end, subscription?.current_period_end)}
          </Text>
          .{CAN_SELL_IN_APP ? " After that, you'll fall back to $99/post." : ''}
        </Text>
        <Text style={[styles.modalBody, { color: c.textSecondary, marginTop: Spacing.sm }]}>
          You can resume any time before then with one click.
        </Text>
        <View style={styles.modalActions}>
          <PillButton label="Keep plan" variant="ghost" onPress={() => setShowCancel(false)} disabled={cancelling} />
          <PillButton label="Cancel at period end" variant="error" onPress={handleCancel} loading={cancelling} />
        </View>
      </HubModal>

      {/* Upgrade / downgrade preview modal — Android only (CAN_SELL_IN_APP) */}
      {CAN_SELL_IN_APP && swap ? (
        <HubModal visible onClose={() => !upgrading && setUpgradeTarget(null)} accessibilityLabel={swap.title}>
          <Text accessibilityRole="header" style={[styles.modalTitle, { color: c.textPrimary }]}>
            {swap.title}
          </Text>
          <View style={styles.swapGrid}>
            <View style={[styles.swapCell, { borderColor: c.border, backgroundColor: c.canvas }]}>
              <Text style={[styles.swapEyebrow, { color: c.textSecondary }]}>Current plan</Text>
              <Text style={[styles.swapName, { color: c.textPrimary }]}>{swap.currentTier?.name ?? 'Builder'}</Text>
              <Text style={[styles.swapPrice, { color: c.textSecondary }]}>${swap.currentTier?.monthly ?? 129}/mo</Text>
            </View>
            <View style={[styles.swapCell, { borderColor: c.indigo, borderWidth: 2, backgroundColor: c.indigo + '0D' }]}>
              <Text style={[styles.swapEyebrow, { color: c.indigo }]}>New plan</Text>
              <Text style={[styles.swapName, { color: c.textPrimary }]}>{swap.targetTier?.name ?? upgradeTarget}</Text>
              <Text style={[styles.swapPrice, { color: c.indigo, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }]}>
                ${swap.targetTier?.monthly ?? 0}/mo
              </Text>
            </View>
          </View>
          <Text style={[styles.swapEyebrow, { color: c.textSecondary, marginBottom: Spacing.sm }]}>What you&apos;ll get</Text>
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
            {(swap.targetTier?.features ?? []).slice(0, 5).map((f) => (
              <View key={f} style={styles.perkRow}>
                <Ionicons name="checkmark" size={16} color={c.indigo} style={{ marginTop: 2 }} />
                <Text style={[styles.swapFeature, { color: c.textSecondary }]}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.proration, { borderColor: c.border, backgroundColor: c.canvas }]}>
            <Text style={[styles.prorationTitle, { color: c.textPrimary }]}>Billing today</Text>
            <Text style={[styles.prorationBody, { color: c.textSecondary }]}>
              {swap.isUpgrade ? (
                <>
                  Stripe will charge a{' '}
                  <Text style={{ color: c.textPrimary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}>prorated amount</Text>{' '}
                  for the difference between Builder and Contractor for the remainder of this billing period. From your next
                  renewal, you&apos;ll be billed ${swap.targetTier?.monthly}/mo.
                </>
              ) : (
                <>
                  You&apos;ll receive a{' '}
                  <Text style={{ color: c.textPrimary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}>prorated credit</Text>{' '}
                  for the unused portion of your Contractor plan. The credit is applied to your next invoice — no immediate
                  charge.
                </>
              )}
            </Text>
          </View>
          <View style={styles.modalActions}>
            <PillButton label="Cancel" variant="outline" onPress={() => setUpgradeTarget(null)} disabled={upgrading} />
            <PillButton
              label={upgrading ? swap.busyLabel : swap.confirmLabel}
              onPress={() => upgradeTarget && confirmTierSwap(upgradeTarget)}
              loading={upgrading}
            />
          </View>
        </HubModal>
      ) : null}
    </HubScreen>
  );
}

function formatStripe(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function capitaliseBrand(brand: string): string {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

const styles = StyleSheet.create({
  cancelBanner: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cancelBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  cancelBannerTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  cancelBannerBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    overflow: 'hidden',
    gap: Spacing.lg,
  },
  blobTopRight: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  blobBottomLeft: {
    position: 'absolute',
    left: -32,
    bottom: -32,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  heroStatus: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  heroStatusLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    color: '#ffffff',
    fontSize: 40,
    lineHeight: 44,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceUnit: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  heroLine: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  heroLineStrong: {
    color: '#ffffff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  meter: {
    gap: 6,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 280,
  },
  meterLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  meterValue: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  meterTrack: {
    height: 8,
    maxWidth: 280,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  perks: {
    gap: Spacing.sm,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  perkText: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  cardRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardBrand: {
    width: 56,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  noSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  noSubText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  noPayments: {
    textAlign: 'center',
    paddingVertical: Spacing['3xl'],
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  paymentDesc: {
    fontSize: 14,
    fontFamily: FontFamily.body,
  },
  paymentDate: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FontFamily.body,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  modalActions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  swapGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  swapCell: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  swapEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  swapName: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  swapPrice: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FontFamily.body,
    fontVariant: ['tabular-nums'],
  },
  swapFeature: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  proration: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  prorationTitle: {
    fontSize: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    marginBottom: 4,
  },
  prorationBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
});
