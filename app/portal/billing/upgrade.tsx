/**
 * /portal/billing/upgrade — port of `~/bldesy-web/app/portal/billing/upgrade/page.tsx`.
 *
 * Monthly ↔ annual swap on the SAME tier (Stripe prorates). Most upgrades
 * flow monthly → annual; annual subscribers landing here are downgrading —
 * both paths are supported. This is a plan change on an existing paid
 * subscription, so it exists only where the app may sell (CAN_SELL_IN_APP);
 * on iOS the route bounces back to /portal/billing.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import { swapPlan, useBillingState } from '@/lib/data/billing';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { ROUTES } from '@/lib/routes';
import { annualSavings, type BillingInterval } from '@/lib/web/pricing-tiers-client';

export default function UpgradePlanPage() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { refreshProfile } = usePortal();
  const billing = useBillingState();
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // iOS sells nothing — the entry is hidden there; a deep link lands on billing.
  useEffect(() => {
    if (!CAN_SELL_IN_APP) router.replace(ROUTES.portalBilling);
  }, [router]);

  if (!CAN_SELL_IN_APP) return null;

  if (billing.loading && !billing.profile) {
    return (
      <PortalPage>
        <Skeleton variant="card" style={{ height: 240 }} />
        <Skeleton variant="card" style={{ height: 160 }} />
      </PortalPage>
    );
  }

  const tier = billing.tierDefinition;
  const RETAINED_FEATURES = tier.features;
  const currentPlan: BillingInterval = billing.billingInterval;
  const targetPlan: BillingInterval = currentPlan === 'monthly' ? 'annual' : 'monthly';
  const isUpgrade = targetPlan === 'annual';

  // Effective monthly rate when billed annually — the strongest selling point.
  const pricing = {
    monthly: tier.monthly,
    annual: tier.annual,
    savings: annualSavings(tier.monthly, tier.annual),
  };
  const annualEffectiveMonthly = (pricing.annual / 12).toFixed(2);
  const monthlyAsAnnualTotal = pricing.monthly * 12;

  async function handleConfirm() {
    if (!consent) return;
    setSubmitting(true);
    try {
      const result = await swapPlan(targetPlan);
      await Promise.all([refreshProfile(), billing.refresh()]);
      toast.show(result.message ?? 'Plan changed.', { variant: 'success' });
      router.replace(ROUTES.portalBilling);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || "Couldn't change plan." : 'Network error during plan change.', {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Guard: must have an active subscription to swap plans.
  if (!billing.hasSubscription) {
    return (
      <PortalPage>
        <View style={styles.guard}>
          <Text accessibilityRole="header" style={[styles.guardTitle, { color: c.textPrimary }]}>
            No active subscription
          </Text>
          <Text style={[styles.guardBody, { color: c.textSecondary }]}>
            You need an active subscription before you can switch plans.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(ROUTES.portalPending)}
            style={[styles.primaryButton, { backgroundColor: c.primary }]}
          >
            <Text style={styles.primaryButtonText}>View Plans</Text>
          </Pressable>
        </View>
      </PortalPage>
    );
  }

  const backLink = (
    <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.portalBilling)} style={styles.back}>
      <Ionicons name="chevron-back" size={16} color={c.textSecondary} />
      <Text style={[styles.backText, { color: c.textSecondary }]}>Back to Billing</Text>
    </Pressable>
  );

  /* ── Downgrade path (annual → monthly) — kept simple ─────────── */
  if (!isUpgrade) {
    return (
      <PortalPage>
        {backLink}
        <View>
          <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
            Switch to monthly
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            You&apos;ll keep your annual access until your current period ends, then move to{' '}
            <Text style={[styles.strong, { color: c.textPrimary }]}>${pricing.monthly}/month</Text>. That&apos;s $
            {pricing.savings} more per year vs staying annual.
          </Text>
        </View>
        <Card padding={Spacing.xl} flat>
          <ConsentRow
            checked={consent}
            onChange={setConsent}
            accent={c.primary}
            label={`I understand my plan will switch to $${pricing.monthly}/month at my next renewal.`}
          />
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(ROUTES.portalBilling)}
              style={[styles.secondaryButton, { borderColor: c.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: c.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!consent || submitting}
              onPress={() => void handleConfirm()}
              style={[styles.primaryButton, { backgroundColor: c.primary }, (!consent || submitting) && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>{submitting ? 'Updating...' : 'Confirm switch to monthly'}</Text>
            </Pressable>
          </View>
        </Card>
      </PortalPage>
    );
  }

  /* ── Upgrade path (monthly → annual) — the conversion page ──── */
  const savingsPct = Math.round((pricing.savings / monthlyAsAnnualTotal) * 100);

  return (
    <PortalPage>
      {backLink}

      {/* ── Hero: lead with the savings ─────────────────────────── */}
      <LinearGradient colors={['#0f1f1d', '#13312c', c.primary + '4D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroPill}>
          <Ionicons name="heart" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.heroPillText}>Annual upgrade</Text>
        </View>
        <Text style={styles.heroLead}>Pay yearly, save</Text>
        <Text accessibilityRole="header" style={styles.heroAmount}>
          ${pricing.savings}
          <Text style={styles.heroAmountUnit}> / year</Text>
        </Text>
        <Text style={styles.heroBody}>
          Same plan. Same features. Just <Text style={styles.heroBodyStrong}>${annualEffectiveMonthly}/month</Text> when
          billed annually — instead of ${pricing.monthly}/month.
        </Text>
        <View style={styles.trustStrip}>
          <TrustItem icon="checkmark-circle-outline" label="Switch back any time" />
          <TrustItem icon="lock-closed-outline" label="Secured by Stripe" />
          <TrustItem icon="card-outline" label="Prorated — pay only the difference" />
        </View>
      </LinearGradient>

      {/* ── Comparison: monthly vs annual, with annual dominant ── */}
      <View style={styles.compare}>
        <View style={[styles.compareCard, { borderColor: c.border, backgroundColor: c.canvas + '80' }]}>
          <View style={styles.compareHeader}>
            <Text style={[styles.compareEyebrow, { color: c.textSecondary }]}>Your current plan</Text>
            <View style={[styles.comparePill, { backgroundColor: c.border + '99' }]}>
              <Text style={[styles.comparePillText, { color: c.textSecondary }]}>CURRENT</Text>
            </View>
          </View>
          <Text style={[styles.compareName, { color: c.textPrimary }]}>Monthly</Text>
          <View style={styles.compareRow}>
            <Text style={[styles.comparePrice, { color: c.textSecondary }]}>${pricing.monthly}</Text>
            <Text style={[styles.comparePeriod, { color: c.textSecondary }]}>/mo</Text>
          </View>
          <View style={[styles.yearlyBox, { backgroundColor: c.canvas }]}>
            <Text style={[styles.yearlyLabel, { color: c.textSecondary + 'B3' }]}>Yearly cost</Text>
            <Text style={[styles.yearlyValue, { color: c.textSecondary }]}>
              ${monthlyAsAnnualTotal} <Text style={styles.yearlyNote}>($ {pricing.monthly} × 12)</Text>
            </Text>
          </View>
        </View>

        <View style={[styles.compareCard, styles.compareStar, { borderColor: c.success, backgroundColor: c.success + '14' }]}>
          <View style={[styles.ribbon, { backgroundColor: c.success, borderColor: c.canvas }]}>
            <Ionicons name="star" size={12} color="#ffffff" />
            <Text style={styles.ribbonText}>Best value</Text>
          </View>
          <View style={[styles.compareHeader, { marginTop: Spacing.sm }]}>
            <Text style={[styles.compareEyebrow, { color: c.success }]}>Recommended</Text>
            <View style={[styles.comparePill, { backgroundColor: c.success + '26' }]}>
              <Text style={[styles.comparePillText, { color: c.success }]}>SAVE ${pricing.savings}</Text>
            </View>
          </View>
          <Text style={[styles.compareName, { color: c.textPrimary }]}>Annual</Text>
          <View style={styles.compareRow}>
            <Text style={[styles.comparePriceLg, { color: c.textPrimary }]}>${pricing.annual}</Text>
            <Text style={[styles.comparePeriod, { color: c.textSecondary }]}>/yr</Text>
            <Text style={[styles.struck, { color: c.textSecondary }]}>${monthlyAsAnnualTotal}</Text>
          </View>
          <Text style={[styles.effective, { color: c.success }]}>Just ${annualEffectiveMonthly}/month — billed once a year</Text>
          <View style={[styles.savingsBox, { borderColor: c.success + '26', backgroundColor: c.surface + 'CC' }]}>
            <View style={styles.savingsRow}>
              <Text style={[styles.savingsLabel, { color: c.textSecondary }]}>Your savings</Text>
              <Text style={[styles.savingsValue, { color: c.success }]}>−${pricing.savings}/yr</Text>
            </View>
            <View style={[styles.savingsTrack, { backgroundColor: c.success + '1A' }]}>
              <View
                style={[
                  styles.savingsFill,
                  { width: `${Math.min(100, (pricing.savings / monthlyAsAnnualTotal) * 100)}%`, backgroundColor: c.success },
                ]}
              />
            </View>
            <Text style={[styles.savingsNote, { color: c.textSecondary }]}>That&apos;s {savingsPct}% off vs monthly billing.</Text>
          </View>
        </View>
      </View>

      {/* ── "Same plan, just cheaper" reassurance ──────────────── */}
      <Card padding={Spacing.xl} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary }]}>
          Everything you have today, kept
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary, marginBottom: Spacing.lg }]}>
          Annual is the same BLDESY Pro plan you&apos;re on now — same access, same features, same support. You&apos;re only
          changing how often we charge.
        </Text>
        <View style={styles.features}>
          {RETAINED_FEATURES.map((f) => (
            <View key={f} style={styles.feature}>
              <Ionicons name="checkmark" size={16} color={c.success} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: c.textPrimary }]}>{f}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ── What happens next — timeline-style ─────────────────── */}
      <Card padding={Spacing.xl} flat>
        <Text accessibilityRole="header" style={[styles.h2, { color: c.textPrimary, marginBottom: Spacing.xl }]}>
          What happens when you confirm
        </Text>
        <View style={styles.timeline}>
          <TimelineStep
            n={1}
            circle={{ bg: c.success, fg: '#ffffff', ring: c.success + '1A' }}
            title={`You're charged $${pricing.annual} now (less a credit for the unused part of this month)`}
            body="Stripe handles the proration automatically — you only pay the difference between what you've already paid and the new annual amount."
          />
          <TimelineStep
            n={2}
            circle={{ bg: c.primary + '26', fg: c.primary, ring: c.primary + '0D' }}
            title="Your next renewal is one year from today"
            body="No more monthly invoices — one charge a year, no surprises."
          />
          <TimelineStep
            n={3}
            circle={{ bg: c.canvas, fg: c.textSecondary, ring: c.border }}
            title="Cancel or switch back to monthly any time"
            body="You're not locked in — manage everything from your billing page in one click."
          />
        </View>
      </Card>

      {/* ── Consent + CTA ─────────────────────────────────────── */}
      <Card padding={Spacing.xl} style={{ borderColor: c.success + '4D', borderWidth: 2 }}>
        <ConsentRow
          checked={consent}
          onChange={setConsent}
          accent={c.success}
          label={
            <>
              I authorise BLDESY to charge my saved payment method{' '}
              <Text style={[styles.strong, { color: c.textPrimary }]}>${pricing.annual}</Text> (less a prorated credit for the
              unused part of my current month) and to renew my subscription annually until I cancel.
            </>
          }
        />
        <View style={styles.actions}>
          <Pressable accessibilityRole="link" onPress={() => router.push(ROUTES.portalBilling)} style={styles.notNow}>
            <Text style={[styles.secondaryButtonText, { color: c.textSecondary }]}>Not now</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!consent || submitting}
            onPress={() => void handleConfirm()}
            style={[styles.primaryButton, styles.confirm, { backgroundColor: c.success }, (!consent || submitting) && styles.disabled]}
          >
            <Text style={[styles.primaryButtonText, styles.confirmText]}>
              {submitting ? 'Updating your plan...' : `Confirm — charge $${pricing.annual}`}
            </Text>
            {!submitting ? <Ionicons name="arrow-forward" size={18} color="#ffffff" /> : null}
          </Pressable>
        </View>
        <View style={styles.secure}>
          <Ionicons name="lock-closed-outline" size={14} color={c.textSecondary} />
          <Text style={[styles.secureText, { color: c.textSecondary }]}>
            Secure payment — your card details are stored by Stripe, never on our servers.
          </Text>
        </View>
      </Card>
    </PortalPage>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function ConsentRow({
  checked,
  onChange,
  accent,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  label: React.ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.consent}
    >
      <View style={[styles.checkbox, { borderColor: checked ? accent : c.border, backgroundColor: checked ? accent : 'transparent' }]}>
        {checked ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
      </View>
      <Text style={[styles.consentText, { color: c.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function TrustItem({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.trustItem}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.7)" />
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}

function TimelineStep({
  n,
  circle,
  title,
  body,
}: {
  n: number;
  circle: { bg: string; fg: string; ring: string };
  title: string;
  body: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.step}>
      <View style={[styles.stepRing, { backgroundColor: circle.ring }]}>
        <View style={[styles.stepCircle, { backgroundColor: circle.bg }]}>
          <Text style={[styles.stepNumber, { color: circle.fg }]}>{n}</Text>
        </View>
      </View>
      <View style={styles.stepText}>
        <Text style={[styles.stepTitle, { color: c.textPrimary }]}>{title}</Text>
        <Text style={[styles.stepBody, { color: c.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guard: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing.lg,
  },
  guardTitle: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  guardBody: {
    marginTop: Spacing.sm,
    marginBottom: Spacing['2xl'],
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  backText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  h2: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  strong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  hero: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['5xl'],
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  heroPillText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  heroLead: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -1,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  heroAmountUnit: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  heroBody: {
    marginTop: Spacing.xl,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  heroBodyStrong: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  trustStrip: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing.xl,
    rowGap: Spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  compare: {
    gap: Spacing.lg,
  },
  compareCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  compareStar: {
    borderRadius: Radius['2xl'],
    borderWidth: 2,
    paddingTop: Spacing['2xl'],
  },
  ribbon: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
  },
  ribbonText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  compareEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  comparePill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  comparePillText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  compareName: {
    marginBottom: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  comparePrice: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  comparePriceLg: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  comparePeriod: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  struck: {
    marginLeft: Spacing.sm,
    fontSize: 16,
    lineHeight: 24,
    textDecorationLine: 'line-through',
    fontFamily: FontFamily.body,
  },
  yearlyBox: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  yearlyLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  yearlyValue: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  yearlyNote: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    fontWeight: '400',
  },
  effective: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  savingsBox: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  savingsValue: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  savingsTrack: {
    marginTop: Spacing.sm,
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  savingsFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  savingsNote: {
    marginTop: Spacing.sm,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  features: {
    gap: Spacing.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  timeline: {
    gap: Spacing.xl,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stepRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  stepBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  checkbox: {
    marginTop: 2,
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  confirm: {
    paddingVertical: Spacing.lg,
  },
  confirmText: {
    fontSize: 16,
    lineHeight: 24,
  },
  secondaryButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  notNow: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  secure: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
});
