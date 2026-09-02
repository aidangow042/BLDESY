/**
 * /portal/billing — port of `~/bldesy-web/app/portal/billing/page.tsx`, one
 * branch per lib/data/billing `billingView`:
 *
 *   paused        "Profile paused" + Reactivate (charges the saved card — a
 *                 purchase, so iOS shows the web note instead)
 *   free          $0 plan hero + the free-enquiry meter + card status
 *   founding_free the plan card with no purchase prompt (the web falls
 *                 through to "No active subscription" for these rows)
 *   legacy_none   "No active subscription" / View Plans (Android only)
 *   past_due      value-gated dunning (full access) or the legacy takeover
 *   cancelled     Resubscribe (Android only)
 *   grace/active  hero + payment method + frequency + invoices + cancel
 *
 * iOS sells nothing (CLAUDE.md §6): no tier prices for selling, no card
 * capture, no purchase links — read-only plan state, meter, cancel/resume.
 */
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  CancelSubscriptionButton,
  MANAGE_CARD_ON_WEB,
  ResumeSubscriptionButton,
  UpdateCardControl,
} from '@/components/billing/billing-actions';
import { CardBrandIcon } from '@/components/billing/card-brand-icon';
import { usePortal } from '@/components/portal/portal-context';
import { PortalPage } from '@/components/portal/portal-page';
import { Card, Skeleton, useToast } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/lib/api';
import {
  annualUpgradeEligible,
  CardDeclinedError,
  contactMeterPercent,
  formatCurrency,
  getPlanDisplay,
  reactivate,
  syncFromStripe,
  useBillingState,
  type Invoice,
} from '@/lib/data/billing';
import { dispatchProfileChanged } from '@/lib/events/profile';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { ROUTES } from '@/lib/routes';

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Tailwind palette values the web's grace / dunning cards use. */
const AMBER = { border: '#fcd34d', bg: '#fffbeb', title: '#78350f', body: '#92400e' };
const ORANGE = { border: '#fed7aa', bg: '#ffedd5', icon: '#ea580c', text: '#c2410c' };
const SLATE = { bg: '#e2e8f0', icon: '#475569' };

/* ── Page ─────────────────────────────────────────────────────────── */

export default function BillingPage() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const toast = useToast();
  const { refreshProfile } = usePortal();
  const billing = useBillingState();
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshAll() {
    await Promise.all([billing.refresh(), refreshProfile()]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }

  /* ── Sync with Stripe (manual reconciliation) ───────────────────── */
  async function syncNow() {
    setSyncing(true);
    try {
      await syncFromStripe();
      await refreshAll();
      toast.show('Synced with Stripe.', { variant: 'success' });
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message || 'Sync failed.' : 'Network error during sync.', {
        variant: 'error',
      });
    } finally {
      setSyncing(false);
    }
  }

  /* ── Loading skeleton ───────────────────────────────────────────── */
  if (billing.loading && !billing.profile) {
    return (
      <PortalPage>
        <Header sub="Manage your subscription and payment." />
        <Skeleton variant="card" style={{ height: 280 }} />
        <Skeleton variant="card" style={{ height: 160 }} />
        <Skeleton variant="card" style={{ height: 160 }} />
      </PortalPage>
    );
  }

  const plan = getPlanDisplay(
    billing.tierDefinition,
    billing.billingInterval,
    billing.subscription?.amount ?? null,
    billing.subscription?.currency ?? null,
  );
  const nextBillingDate = billing.subscription?.current_period_end
    ? formatDate(billing.subscription.current_period_end)
    : null;
  const cancelling = billing.cancelAtPeriodEnd;
  const contactCount = billing.qualifiedContactCount;
  const threshold = billing.threshold;

  /* ── Paused: hidden from search until reactivated — nothing deleted. ── */
  if (billing.view === 'paused') {
    return (
      <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
        <Header sub="Your profile is paused." />
        <Card padding={0} style={styles.stateCard}>
          <View style={[styles.stateIcon, { backgroundColor: SLATE.bg }]}>
            <Ionicons name="pause" size={32} color={SLATE.icon} />
          </View>
          <Text style={[styles.stateTitle, { color: c.textPrimary }]}>Profile paused</Text>
          <Text style={[styles.stateBody, { color: c.textSecondary }]}>
            You&apos;re hidden from search and new enquiries. Your profile, verification and conversations
            are all kept — reactivate and you&apos;re straight back in search.
          </Text>
          {CAN_SELL_IN_APP ? (
            <ReactivateButton onDone={refreshAll} />
          ) : (
            <Text style={[styles.stateNote, styles.stateNoteStrong, { color: c.textPrimary }]}>
              Reactivate on the web at bldesy.com.au
            </Text>
          )}
          <Text style={[styles.stateNote, { color: c.textSecondary }]}>
            Reactivating charges your card on file for your plan straight away.
          </Text>
          {!billing.cardOnFileAt ? (
            <Text style={[styles.stateNote, styles.stateWarn]}>
              Add a card first from your{' '}
              <Text accessibilityRole="link" onPress={() => router.push(ROUTES.portalPending)} style={styles.underline}>
                activation page
              </Text>
              .
            </Text>
          ) : null}
        </Card>
      </PortalPage>
    );
  }

  /* ── Free: the plan they're on (at $0) + the enquiry meter + card status. ── */
  if (billing.view === 'free') {
    const pct = contactMeterPercent(contactCount, threshold);
    return (
      <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
        <Header sub={`Free until ${threshold} homeowners contact you.`} />

        {/* Plan hero — the tradie IS on a plan (matched to their trade),
         * it's just $0 during the free period. */}
        <PlanHero
          name={plan.name}
          badge="Free period"
          price="$0"
          priceNote={CAN_SELL_IN_APP ? `now — then ${plan.price}/${plan.period}` : undefined}
          perks={plan.perks}
        >
          <Text style={styles.heroBody}>
            Enquiries in your trade, from day one. Billing only starts after {threshold} homeowners
            contact you, and even then a 14-day grace period comes first — we&apos;ll message you before
            any charge.
          </Text>
        </PlanHero>

        <Card padding={Spacing['2xl']} flat>
          <View style={styles.meterHeader}>
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>Your free enquiries</Text>
            <Text style={[styles.meterCount, { color: c.textPrimary }]}>
              {Math.min(contactCount, threshold)}
              <Text style={[styles.meterOf, { color: c.textSecondary }]}> of {threshold}</Text>
            </Text>
          </View>
          <View style={[styles.meterTrack, { backgroundColor: c.canvas }]}>
            <View style={[styles.meterFill, { width: `${pct}%`, backgroundColor: c.primary }]} />
          </View>
          <Text style={[styles.meterCopy, { color: c.textSecondary }]}>
            {contactCount >= threshold
              ? "You've reached the threshold — once a card is on file your 14-day grace period starts, and we'll message you before any charge."
              : contactCount === threshold - 1
                ? 'One more enquiry and your free period ends — then a 14-day grace period starts before your first charge. We\'ll message you first.'
                : `Every unique homeowner who reaches out counts as one enquiry. After ${threshold}, you get a 14-day grace period before your first charge — we'll message you first.`}
          </Text>
          <Text style={[styles.meterJunk, { color: c.textSecondary }]}>
            Junk enquiry? Flag it from the lead card or conversation within 7 days and it doesn&apos;t count.
          </Text>
        </Card>

        <Card padding={Spacing['2xl']} flat>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>Card on file</Text>
          {billing.cardOnFileAt ? (
            <View style={styles.cardRow}>
              <Text style={[styles.cardSaved, { color: c.textPrimary }]}>
                <Text style={{ color: '#047857', fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }}>
                  ✓ Card saved
                </Text>{' '}
                — $0 charged so far.
              </Text>
              <UpdateCardControl onReturn={() => void refreshAll()} />
            </View>
          ) : (
            <Text style={[styles.cardNone, { color: c.textSecondary }]}>
              No card on file yet. When cards are required at launch you&apos;ll be asked to add one from
              your{' '}
              <Text
                accessibilityRole="link"
                onPress={() => router.push(ROUTES.portalPending)}
                style={[styles.underline, { color: c.primary, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' }]}
              >
                activation page
              </Text>{' '}
              — $0 until {threshold} homeowners contact you.
            </Text>
          )}
        </Card>
      </PortalPage>
    );
  }

  /* ── Founding tradies: on a plan at $0, never billed, nothing to buy. ── */
  if (billing.view === 'founding_free') {
    return (
      <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
        <Header sub="Manage your subscription and payment." />
        <PlanHero name={plan.name} badge="Founding" price="$0" perks={plan.perks} />
      </PortalPage>
    );
  }

  /* ── No subscription state (legacy NULL plan_state) ─────────────── */
  if (billing.view === 'legacy_none') {
    return (
      <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
        <Header sub="You don't have an active subscription yet." />
        <Card padding={0} style={styles.stateCard}>
          <View style={[styles.stateIcon, { backgroundColor: c.primary + '1A' }]}>
            <Ionicons name="card-outline" size={32} color={c.primary} />
          </View>
          <Text style={[styles.stateTitle, { color: c.textPrimary }]}>No active subscription</Text>
          <Text style={[styles.stateBody, { color: c.textSecondary }]}>
            Subscribe to get your profile live, apply to jobs, and grow your business on BLDESY.
          </Text>
          {CAN_SELL_IN_APP ? (
            <PrimaryAction label="View Plans" onPress={() => router.push(ROUTES.portalPending)} />
          ) : null}
          <SyncLink label="Already paid in Stripe? Sync now" syncing={syncing} onPress={() => void syncNow()} />
        </Card>
      </PortalPage>
    );
  }

  /* ── Value-gated dunning: past_due keeps FULL access ─────────────── */
  if (billing.view === 'past_due' && billing.planState === 'past_due') {
    return (
      <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
        <Header sub="Your payment didn't go through." />
        <Card padding={0} style={[styles.stateCard, { borderColor: ORANGE.border }]}>
          <View style={[styles.stateIcon, { backgroundColor: ORANGE.bg }]}>
            <Ionicons name="card-outline" size={32} color={ORANGE.icon} />
          </View>
          <Text style={[styles.stateTitle, { color: c.textPrimary }]}>Let&apos;s fix your card</Text>
          <Text style={[styles.stateBody, { color: c.textSecondary }]}>
            Your profile stays live in search while we retry the charge over the next few days. Update your
            card and the next retry sorts it — if it keeps failing your profile is paused until billing is
            fixed.
          </Text>
          <UpdateCardControl triggerLabel="Update card" prominent onReturn={() => void refreshAll()} />
          <SyncLink label="Already fixed in Stripe? Sync now" syncing={syncing} onPress={() => void syncNow()} />
        </Card>
      </PortalPage>
    );
  }

  /* ── Cancelled or legacy past-due — billing knows about a sub but it's not usable. ── */
  if (billing.view === 'cancelled' || billing.view === 'past_due') {
    const isCancelled = billing.view === 'cancelled';
    return (
      <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
        <Header sub={`Your subscription is ${isCancelled ? 'cancelled' : 'past due'}.`} />
        <Card padding={0} style={styles.stateCard}>
          <View style={[styles.stateIcon, { backgroundColor: isCancelled ? c.error + '1A' : c.warning + '1A' }]}>
            <Ionicons name="alert-circle-outline" size={32} color={isCancelled ? c.error : c.warning} />
          </View>
          <Text style={[styles.stateTitle, { color: c.textPrimary }]}>
            {isCancelled ? 'Subscription cancelled' : 'Payment past due'}
          </Text>
          <Text style={[styles.stateBody, { color: c.textSecondary }]}>
            {isCancelled
              ? 'Resubscribe to get your profile back live and resume applying for jobs.'
              : 'Update your payment method to keep your profile active.'}
          </Text>
          {CAN_SELL_IN_APP ? (
            <PrimaryAction
              label={isCancelled ? 'Resubscribe' : 'Update Payment'}
              onPress={() => router.push(ROUTES.portalPending)}
            />
          ) : !isCancelled ? (
            <Text style={[styles.stateNote, styles.stateNoteStrong, { color: c.textPrimary }]}>{MANAGE_CARD_ON_WEB}</Text>
          ) : null}
          <SyncLink label="Already reactivated in Stripe? Sync now" syncing={syncing} onPress={() => void syncNow()} />
        </Card>
      </PortalPage>
    );
  }

  /* ── Active subscription (incl. a trialing grace-period sub) ─────── */
  const graceDateLabel =
    billing.view === 'grace' && billing.graceEndsAt
      ? new Date(billing.graceEndsAt).toLocaleDateString('en-AU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : null;

  const upgrade = annualUpgradeEligible({
    interval: billing.billingInterval,
    cancelAtPeriodEnd: cancelling,
    tier: billing.tierDefinition,
    stripeAmountCents: billing.subscription?.amount ?? null,
    canSwapPlan: billing.subscription?.canSwapPlan,
  });

  return (
    <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
      {/* Value-gated grace period: full access at $0 until the trial-end charge. */}
      {billing.view === 'grace' ? (
        <View style={[styles.grace, { borderColor: AMBER.border, backgroundColor: AMBER.bg }]}>
          <Text style={[styles.graceTitle, { color: AMBER.title }]}>
            Grace period — full access, $0{graceDateLabel ? ` until ${graceDateLabel}` : ''}
          </Text>
          <Text style={[styles.graceBody, { color: AMBER.body }]}>
            {threshold} homeowners have reached out, so your free period has ended. Your first charge (
            {plan.price}/{plan.period}) lands
            {graceDateLabel ? ` on ${graceDateLabel}` : ' at the end of the grace period'} — we&apos;ll remind
            you before then. Cancel below first and you pay nothing.
          </Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.headerRow}>
        <Header sub="Manage your subscription and payment." />
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Pull the latest subscription state from Stripe"
            disabled={syncing}
            onPress={() => void syncNow()}
            style={[styles.syncButton, { borderColor: c.border }, syncing && styles.disabled]}
          >
            <Ionicons name="refresh-outline" size={16} color={c.textSecondary} />
            <Text style={[styles.syncButtonText, { color: c.textSecondary }]}>{syncing ? 'Syncing...' : 'Sync'}</Text>
          </Pressable>
          {cancelling ? <ResumeSubscriptionButton onSuccess={() => void refreshAll()} /> : null}
        </View>
      </View>

      {/* Upgrade banner — a plan change on the existing subscription, so it
          only shows where the app may sell. */}
      {upgrade.eligible && CAN_SELL_IN_APP ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.portalBillingUpgrade)}
          style={[styles.upgrade, { borderColor: c.success + '4D', backgroundColor: c.success + '14' }]}
        >
          <View style={[styles.upgradeIcon, { backgroundColor: c.success }]}>
            <Ionicons name="trending-up-outline" size={20} color="#ffffff" />
          </View>
          <View style={styles.upgradeText}>
            <Text style={[styles.upgradeTitle, { color: c.textPrimary }]}>
              Save ${upgrade.savings.toLocaleString('en-AU')}/year — upgrade to annual
            </Text>
            <Text style={[styles.upgradeSub, { color: c.textSecondary }]}>
              Pay ${billing.tierDefinition.annual.toLocaleString('en-AU')} once instead of $
              {upgrade.actualMonthly.toLocaleString('en-AU')}/month. Compare plans →
            </Text>
          </View>
          <View style={[styles.upgradePill, { backgroundColor: c.success }]}>
            <Text style={styles.upgradePillText}>Upgrade</Text>
          </View>
        </Pressable>
      ) : null}

      {/* ── Subscription hero card ────────────────────────────────── */}
      <PlanHero
        name={plan.name}
        badge={
          cancelling
            ? 'Cancelling'
            : billing.subscriptionStatus === 'active'
              ? 'Active'
              : billing.subscriptionStatus === 'trialing'
                ? 'Trialing'
                : 'Active'
        }
        price={plan.price}
        pricePeriod={`/${plan.period}`}
        perks={plan.perks}
      >
        {nextBillingDate ? (
          <Text style={styles.heroBody}>
            {cancelling ? 'Access until ' : 'Next payment on '}
            <Text style={styles.heroBodyStrong}>{nextBillingDate}</Text>
          </Text>
        ) : null}
      </PlanHero>

      {/* ── Payment method & billing frequency ─────────────────────── */}
      <Card padding={Spacing.xl} flat>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Payment Method</Text>
          <UpdateCardControl onReturn={() => void refreshAll()} />
        </View>
        {billing.paymentMethod ? (
          <View style={styles.paymentRow}>
            <CardBrandIcon brand={billing.paymentMethod.brand} />
            <View>
              <Text style={[styles.paymentBrand, { color: c.textPrimary }]}>
                <Text style={styles.capitalize}>{billing.paymentMethod.brand}</Text> ending in{' '}
                {billing.paymentMethod.last4}
              </Text>
              <Text style={[styles.paymentExpiry, { color: c.textSecondary }]}>
                Expires {String(billing.paymentMethod.exp_month).padStart(2, '0')}/{billing.paymentMethod.exp_year}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.paymentRow}>
            <View style={[styles.paymentPlaceholder, { backgroundColor: c.canvas }]}>
              <Ionicons name="card-outline" size={20} color={c.textSecondary + '66'} />
            </View>
            <Text style={[styles.paymentExpiry, { color: c.textSecondary, fontSize: 14, lineHeight: 20 }]}>
              Card details managed by Stripe
            </Text>
          </View>
        )}
      </Card>

      <Card padding={Spacing.xl} flat>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Billing Frequency</Text>
        <View style={styles.paymentRow}>
          <View style={[styles.frequencyIcon, { backgroundColor: c.primary + '1A' }]}>
            <Ionicons name="refresh-outline" size={20} color={c.primary} />
          </View>
          <View>
            <Text style={[styles.paymentBrand, { color: c.textPrimary }]}>
              Billed {billing.billingInterval === 'annual' ? 'annually' : 'monthly'}
            </Text>
            <Text style={[styles.paymentExpiry, { color: c.textSecondary }]}>
              {billing.billingInterval === 'annual' ? 'Renews every 12 months' : 'Renews every month'}
              {cancelling ? ' (auto-renew off)' : ''}
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Billing history ───────────────────────────────────────── */}
      <Card padding={0} flat>
        <View style={styles.historyHeader}>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Billing History</Text>
        </View>
        {billing.invoices.length > 0 ? (
          <View style={[styles.invoiceList, { borderTopColor: c.border }]}>
            {billing.invoices.map((inv, idx) => (
              <InvoiceRow key={`${inv.date}-${idx}`} invoice={inv} first={idx === 0} />
            ))}
          </View>
        ) : (
          <View style={styles.historyEmpty}>
            <View style={[styles.historyEmptyIcon, { backgroundColor: c.canvas }]}>
              <Ionicons name="receipt-outline" size={24} color={c.textSecondary + '66'} />
            </View>
            <Text style={[styles.historyEmptyText, { color: c.textSecondary }]}>
              No invoices yet. Your first invoice will appear after your first payment.
            </Text>
          </View>
        )}
      </Card>

      {/* ── Danger zone — cancel link (active subs only) ───────── */}
      {!cancelling ? (
        <View style={styles.cancelRow}>
          <CancelSubscriptionButton periodEndsAt={nextBillingDate} onSuccess={() => void refreshAll()} />
        </View>
      ) : null}

      {/* Secure footer note */}
      <View style={styles.secure}>
        <Ionicons name="lock-closed-outline" size={14} color={c.textSecondary + '80'} />
        <Text style={[styles.secureText, { color: c.textSecondary + '80' }]}>
          All payments are securely processed via Stripe. Your card details are never stored on our servers.
        </Text>
      </View>
    </PortalPage>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function Header({ sub }: { sub: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View>
      <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
        Billing
      </Text>
      <Text style={[styles.sub, { color: c.textSecondary }]}>{sub}</Text>
    </View>
  );
}

function PlanHero({
  name,
  badge,
  price,
  pricePeriod,
  priceNote,
  perks,
  children,
}: {
  name: string;
  badge: string;
  price: string;
  pricePeriod?: string;
  priceNote?: string;
  perks: string[];
  children?: React.ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <LinearGradient
      colors={[c.primary, c.primaryDark, c.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTitleRow}>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          {name}
        </Text>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{badge}</Text>
        </View>
      </View>
      <View style={styles.heroPriceRow}>
        <Text style={styles.heroPrice}>{price}</Text>
        {pricePeriod ? <Text style={styles.heroPeriod}>{pricePeriod}</Text> : null}
        {priceNote ? <Text style={styles.heroPeriod}>{priceNote}</Text> : null}
      </View>
      {children}
      <View style={styles.perks}>
        {perks.map((perk) => (
          <View key={perk} style={styles.perk}>
            <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.primaryAction, { backgroundColor: c.primary }]}>
      <Text style={styles.primaryActionText}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color="#ffffff" />
    </Pressable>
  );
}

function SyncLink({ label, syncing, onPress }: { label: string; syncing: boolean; onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable accessibilityRole="button" disabled={syncing} onPress={onPress} style={[styles.syncLink, syncing && styles.disabled]}>
      <Text style={[styles.syncLinkText, { color: c.textSecondary }]}>{syncing ? 'Syncing...' : label}</Text>
    </Pressable>
  );
}

function ReactivateButton({ onDone }: { onDone: () => Promise<void> | void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      await reactivate();
      toast.show("Welcome back — you're live in search again.", { variant: 'success' });
      dispatchProfileChanged();
      await onDone();
    } catch (e) {
      if (e instanceof CardDeclinedError) toast.show(e.message, { variant: 'error' });
      else if (e instanceof ApiError) toast.show(e.message || "Couldn't reactivate. Please try again.", { variant: 'error' });
      else toast.show('Network error. Please try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={() => void run()}
      style={[styles.primaryAction, { backgroundColor: c.primary }, busy && styles.disabled]}
    >
      <Text style={styles.primaryActionText}>{busy ? 'Reactivating…' : 'Reactivate my profile'}</Text>
    </Pressable>
  );
}

function InvoiceRow({ invoice, first }: { invoice: Invoice; first: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const status =
    invoice.status === 'paid'
      ? { label: 'Paid', bg: c.successBg, fg: c.success }
      : invoice.status === 'open'
        ? { label: 'Pending', bg: '#fefce8', fg: '#ca8a04' }
        : { label: invoice.status ?? 'Unknown', bg: '#f3f4f6', fg: '#6b7280' };
  return (
    <View style={[styles.invoiceRow, !first && { borderTopWidth: 1, borderTopColor: c.border + '80' }]}>
      <View style={styles.invoiceText}>
        <Text style={[styles.invoiceAmount, { color: c.textPrimary }]}>
          {formatCurrency(invoice.amount, invoice.currency)}
        </Text>
        <Text style={[styles.invoiceDate, { color: c.textSecondary }]}>{formatDate(invoice.date)}</Text>
      </View>
      <View style={styles.invoiceMeta}>
        <View style={[styles.invoiceStatus, { backgroundColor: status.bg }]}>
          <Text style={[styles.invoiceStatusText, { color: status.fg }]}>{status.label}</Text>
        </View>
        {invoice.invoice_url ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`View invoice for ${formatDate(invoice.date)}`}
            onPress={() => void Linking.openURL(invoice.invoice_url as string)}
            style={[styles.invoiceView, { borderColor: c.border }]}
          >
            <Text style={[styles.invoiceViewText, { color: c.textSecondary }]}>View</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  headerRow: {
    gap: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: 44,
  },
  syncButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  stateCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['6xl'],
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: Spacing.lg,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  stateBody: {
    marginTop: Spacing.xs,
    maxWidth: 384,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  stateNote: {
    marginTop: Spacing.md,
    maxWidth: 384,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  stateNoteStrong: {
    marginTop: Spacing['2xl'],
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  stateWarn: {
    marginTop: Spacing.sm,
    color: '#c2410c',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  primaryAction: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  syncLink: {
    marginTop: Spacing.lg,
    minHeight: 32,
    justifyContent: 'center',
  },
  syncLinkText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    overflow: 'hidden',
    gap: Spacing.lg,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  heroBadge: {
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  heroPrice: {
    color: '#ffffff',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  heroPeriod: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
  },
  heroBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  heroBodyStrong: {
    color: '#ffffff',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  perks: {
    gap: Spacing.sm,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  perkText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  meterCount: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  meterOf: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  meterTrack: {
    marginTop: Spacing.md,
    height: 10,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  meterCopy: {
    marginTop: Spacing.lg,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  meterJunk: {
    marginTop: Spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  cardRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  cardSaved: {
    flex: 1,
    minWidth: 160,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  cardNone: {
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  grace: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  graceTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  graceBody: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  upgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  upgradeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    flex: 1,
    minWidth: 0,
  },
  upgradeTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  upgradeSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  upgradePill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  upgradePillText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  paymentRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentBrand: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  paymentExpiry: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  paymentPlaceholder: {
    width: 56,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  invoiceList: {
    borderTopWidth: 1,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  invoiceText: {
    flex: 1,
    minWidth: 0,
  },
  invoiceAmount: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  invoiceDate: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  invoiceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  invoiceStatus: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  invoiceStatusText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  invoiceView: {
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceViewText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  historyEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
  },
  historyEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyText: {
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  cancelRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  secureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
});
