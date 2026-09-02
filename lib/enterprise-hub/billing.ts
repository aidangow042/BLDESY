/**
 * lib/enterprise-hub/billing.ts — the enterprise billing page's pure display
 * rules. Port of the helpers at the top of
 * ~/bldesy-web/app/enterprise/billing/page.tsx (enterprisePlanPerks,
 * tierDisplayName, tierPrice, formatStripeDate) plus the payment-history and
 * upgrade-preview labels that page renders inline.
 *
 * The webhook still stores plan as the legacy "starter" | "unlimited" strings;
 * these translate at render time so the user sees the new tier names.
 *
 * iOS sells nothing (CLAUDE.md §6): `tierPrice` and the upgrade preview are
 * only rendered behind CAN_SELL_IN_APP — see app/enterprise/billing.tsx.
 */
import { ENTERPRISE_TIERS, type EnterpriseTier } from '@/lib/web/pricing-tiers-client';

export type EnterpriseTierChoice = 'builder' | 'contractor';

/** Legacy plan vocab → the tier key whose perks/price we show. */
export function planTierKey(plan: string | null | undefined): EnterpriseTierChoice {
  return plan === 'unlimited' ? 'contractor' : 'builder';
}

/** Map legacy plan vocab to the new tier list so we can show real perks. */
export function enterprisePlanPerks(plan: string | null | undefined): readonly string[] {
  return ENTERPRISE_TIERS.find((t) => t.key === planTierKey(plan))?.features ?? [];
}

export function tierDisplayName(plan: string | null | undefined): 'Builder' | 'Contractor' {
  return plan === 'unlimited' ? 'Contractor' : 'Builder';
}

/** Monthly price of the plan — a PRICE: never render on iOS. */
export function tierPrice(plan: string | null | undefined): number {
  return plan === 'unlimited' ? 299 : 129;
}

/** Stripe unix-seconds → "12 Aug 2026"; null when absent. */
export function formatStripeDate(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** ISO timestamp → "12 Aug 2026"; null when absent. */
export function formatIsoDateLong(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The hero's "Next payment on" / "Access until" date: Stripe first, the DB row as fallback. */
export function periodEndLabel(
  stripePeriodEnd: number | null | undefined,
  dbPeriodEnd: string | null | undefined,
): string | null {
  return formatStripeDate(stripePeriodEnd) ?? formatIsoDateLong(dbPeriodEnd);
}

/** The cancel dialog's "Your plan stays active until …" date. */
export function cancelUntilLabel(
  stripePeriodEnd: number | null | undefined,
  dbPeriodEnd: string | null | undefined,
): string {
  return periodEndLabel(stripePeriodEnd, dbPeriodEnd) ?? 'the end of your current billing period';
}

export function paymentDescription(type: string): string {
  return type === 'subscription' ? 'Subscription payment' : 'Job post payment';
}

/** Cents → "$129.00" (the history table's own format). */
export function formatPaymentAmount(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)}`;
}

export function paymentStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export type PaymentStatusTone = 'success' | 'error' | 'warning';

export function paymentStatusTone(status: string): PaymentStatusTone {
  if (status === 'succeeded') return 'success';
  if (status === 'failed') return 'error';
  return 'warning';
}

/** "Expires 03/2028" */
export function cardExpiryLabel(expMonth: number, expYear: number): string {
  return `Expires ${String(expMonth).padStart(2, '0')}/${expYear}`;
}

export interface TierSwapPreview {
  isUpgrade: boolean;
  title: string;
  currentTier: EnterpriseTier | undefined;
  targetTier: EnterpriseTier | undefined;
  confirmLabel: string;
  busyLabel: string;
}

/** The upgrade / downgrade preview modal's derived copy (UpgradePreviewModal). */
export function tierSwapPreview(currentPlan: string | null | undefined, target: EnterpriseTierChoice): TierSwapPreview {
  const currentTierKey = planTierKey(currentPlan);
  const isUpgrade = currentTierKey === 'builder' && target === 'contractor';
  return {
    isUpgrade,
    title: isUpgrade ? 'Upgrade to Contractor' : 'Switch to Builder',
    currentTier: ENTERPRISE_TIERS.find((t) => t.key === currentTierKey),
    targetTier: ENTERPRISE_TIERS.find((t) => t.key === target),
    confirmLabel: isUpgrade ? 'Confirm upgrade' : 'Confirm switch',
    busyLabel: isUpgrade ? 'Upgrading…' : 'Switching…',
  };
}

/* ── Copy (verbatim from the billing page) ──────────────────────────── */

export const BILLING_COPY = {
  title: 'Billing & Plans',
  subtitle: 'Manage your subscription and payment history',
  cancelledOk: 'Subscription set to cancel at period end.',
  cancelFailed: 'Failed to cancel subscription. Please try again.',
  cancelError: 'Something went wrong. Please try again.',
  resumedOk: 'Subscription resumed.',
  resumeFailed: 'Failed to resume subscription.',
  networkError: 'Network error. Please try again.',
  swapFailed: "Couldn't change tier.",
  swapOk: 'Tier updated.',
  noPayments: 'No payments yet.',
  noCard: 'No card on file.',
} as const;

/** The iOS / no-subscription line — plain text, never a link (Apple 3.1.1). */
export const MANAGE_ON_WEB_COPY = 'Manage your plan on the web at bldesy.com.au';
