/**
 * lib/data/billing.ts — tradie (and enterprise) billing state + actions.
 *
 * Port of:
 *   ~/bldesy-web/app/portal/billing/page.tsx            (state resolution, tier/interval, views)
 *   ~/bldesy-web/app/portal/billing/native-actions.tsx  (cancel / resume)
 *   ~/bldesy-web/app/portal/billing/upgrade/page.tsx    (swap-plan)
 *   ~/bldesy-web/components/billing/card-setup-card.tsx (card-step flag read)
 *   ~/bldesy-web/app/enterprise/billing/page.tsx        (enterprise cancel / resume / swap tier)
 *   ~/bldesy-web/lib/billing/plan-state.ts + config.ts  (via the verbatim mirrors)
 *
 * Route contract (verified against the route sources):
 *   GET  /api/stripe/billing-details             → BillingDetails (401, 404 "No billing data")
 *   GET  /api/billing/card-setup                 → { enabled } — THE value_gated_billing flag read
 *   POST /api/billing/reactivate                 → { ok } | { ok, already }; 402 card declined, 400 no card
 *   POST /api/stripe/cancel-subscription|resume-subscription → { cancel_at_period_end, status }
 *   POST /api/stripe/swap-plan { plan }          → { success, message }
 *   GET  /api/stripe/enterprise-subscription-state
 *   POST /api/stripe/enterprise-cancel|enterprise-resume|enterprise-swap-tier
 *
 * Billing columns (plan_state, qualified_contact_count, grace_ends_at,
 * card_on_file_at, card_required_at, subscription_*) live ONLY on the tradie's
 * own builder_profiles row — the public view has none of them.
 *
 * iOS sells nothing (CLAUDE.md §6): screens must gate swapPlan(),
 * reactivate() and swapEnterpriseTier() — anything that changes what is
 * charged — behind CAN_SELL_IN_APP from lib/iap-policy. Cancel/resume and
 * every read here are allowed everywhere.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { onProfileChanged } from '@/lib/events/profile';
import { db } from '@/lib/supabase';
import { CONTACT_THRESHOLD } from '@/lib/web/billing/config';
import { acceptsNewEnquiries, hasPortalAccess } from '@/lib/web/billing/plan-state';
import {
  annualSavings,
  pickTierForTrades,
  tradieTier,
  TRADIE_TIERS,
  type BillingInterval,
  type EnterpriseTierKey,
  type TradieTier,
  type TradieTierKey,
} from '@/lib/web/pricing-tiers-client';
import type { Database, PlanState, SubscriptionPlan, SubscriptionStatusType } from '@/types/database';

import { requireUserId } from './own-session';
import type { OwnBuilderProfile } from './portal';

/* ── Website API shapes ─────────────────────────────────────────────── */

export interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface Invoice {
  /** Cents (amount_paid). */
  amount: number;
  currency: string;
  status: string | null;
  /** Unix seconds. */
  date: number;
  period_start: number;
  period_end: number;
  invoice_url: string | null;
}

export interface SubscriptionDetails {
  status: string;
  /** Unix seconds. */
  current_period_start: number;
  /** Unix seconds; null when Stripe has no period end for the item. */
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  /** Derived server-side from the Stripe price — more trustworthy than the profile column. */
  tier: string | null;
  interval: string | null;
  /** Actual billed amount in cents (null when unavailable). */
  amount: number | null;
  currency: string | null;
  /** True when the price maps to a real tier and swap-plan will accept it. */
  canSwapPlan?: boolean;
}

export interface BillingDetails {
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
  subscription: SubscriptionDetails | null;
}

export interface SubscriptionToggleResult {
  cancel_at_period_end: boolean;
  status: string;
}

export interface SwapPlanResult {
  success: true;
  message: string;
}

export interface ReactivateResult {
  ok: true;
  /** State was already active / a subscription already existed — nothing changed. */
  already?: boolean;
}

export interface EnterpriseSubscriptionState {
  subscription: {
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    cancel_at: number | null;
    current_period_end: number | null;
    tier: Extract<EnterpriseTierKey, 'builder' | 'contractor'> | null;
    interval: string | null;
  } | null;
  paymentMethod: PaymentMethod | null;
}

export interface EnterpriseCancelResult {
  success: true;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
}

export interface EnterpriseResumeResult {
  success: true;
  cancel_at_period_end: boolean;
}

export interface EnterpriseSwapTierResult {
  success: true;
  tier: 'builder' | 'contractor';
  status: string;
  message: string;
}

/* ── Errors ─────────────────────────────────────────────────────────── */

/** The website's 402 message from /api/billing/reactivate. */
export const CARD_DECLINED_MESSAGE =
  'Your card was declined. Update your card from billing, then try again.';

/** Reactivation charged the saved card and it was declined (HTTP 402). */
export class CardDeclinedError extends Error {
  readonly status = 402 as const;

  constructor(message: string = CARD_DECLINED_MESSAGE) {
    super(message);
    this.name = 'CardDeclinedError';
  }
}

/* ── Reads ──────────────────────────────────────────────────────────── */

/**
 * Live Stripe billing details. Resolves null on 404 — the route's
 * `{ error: "No billing data" }` for tradies with no Stripe customer yet
 * (the website page treats any non-OK as "no billing data").
 */
export async function fetchBillingDetails(): Promise<BillingDetails | null> {
  try {
    return await api.get<BillingDetails>('/api/stripe/billing-details');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Is the value-gated card step live? app_flags is service-role-only, so the
 * flag comes via GET /api/billing/card-setup. Any failure reads as OFF,
 * matching the pending page's `.catch(() => setCardStepEnabled(false))`.
 */
export async function fetchCardStepEnabled(): Promise<boolean> {
  try {
    const res = await api.get<{ enabled?: boolean }>('/api/billing/card-setup');
    return res?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Pull the latest subscription state from Stripe into the profile row
 * (billing page "Sync" / post-checkout reconcile).
 *
 * NOTE: /api/stripe/sync authenticates with the cookie client
 * (`createClient()`), so Bearer-authenticated app calls 401 until the web
 * switches it to `createApiClient(request)`.
 */
export async function syncFromStripe(sessionId?: string | null): Promise<void> {
  await api.post('/api/stripe/sync', sessionId ? { session_id: sessionId } : {});
}

/** Own-row billing columns the billing page reads. */
export const BILLING_PROFILE_COLUMNS = [
  'user_id',
  'status',
  'plan_state',
  'qualified_contact_count',
  'grace_ends_at',
  'card_on_file_at',
  'card_required_at',
  'billing_interval',
  'subscription_status',
  'subscription_tier',
  'subscription_plan',
  'stripe_subscription_id',
  'search_paused_at',
  'trade_category',
  'trade_categories',
] as const;

export type BillingProfile = Pick<OwnBuilderProfile, (typeof BILLING_PROFILE_COLUMNS)[number]>;

/** The signed-in tradie's billing columns (RLS: owner only). */
export async function getOwnBillingProfile(userId?: string): Promise<BillingProfile | null> {
  const uid = userId ?? (await requireUserId());
  const { data, error } = await db
    .from('builder_profiles')
    .select(BILLING_PROFILE_COLUMNS.join(', '))
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as BillingProfile | null) ?? null;
}

/* ── Pure resolution (app/portal/billing/page.tsx) ──────────────────── */

/**
 * Resolve which tier the user is on. Source-of-truth ordering:
 *   1. the tier argument — billing-details' Stripe-price tier, else
 *      profile.subscription_tier (written by webhook + /api/stripe/sync)
 *   2. pickTierForTrades(trade_categories) — fallback for legacy band
 *      subscriptions that pre-date the tier column
 *   3. "trade" — final fallback if the user has no trades at all
 */
export function resolveTier(
  subscriptionTier: string | null | undefined,
  tradeCategories: readonly string[] | null | undefined,
  legacyTradeCategory: string | null | undefined,
): TradieTier {
  const valid = TRADIE_TIERS.find((t) => t.key === subscriptionTier);
  if (valid) return valid;
  const trades =
    tradeCategories && tradeCategories.length > 0
      ? tradeCategories
      : legacyTradeCategory
        ? [legacyTradeCategory]
        : [];
  return tradieTier(pickTierForTrades(trades));
}

/**
 * Billing interval: prefer what billing-details derives from the live Stripe
 * subscription; the profile columns are a fallback and can drift. With no
 * sub yet, the interval chosen at card-on-file is what grace will start on.
 */
export function resolveBillingInterval(
  stripeInterval: string | null | undefined,
  subscriptionPlan: SubscriptionPlan | null | undefined,
  billingInterval: BillingInterval | null | undefined,
): BillingInterval {
  if (stripeInterval === 'annual' || stripeInterval === 'monthly') return stripeInterval;
  return subscriptionPlan ?? billingInterval ?? 'monthly';
}

/**
 * Which billing-page state applies.
 *
 *   paused        no sub, plan_state paused            → Reactivate
 *   free          no sub, plan_state free              → $0 plan hero + enquiry meter + card status
 *   founding_free no sub, manual grandfather           → (website falls through to legacy_none;
 *                                                         surfaced separately so the app never
 *                                                         shows a founding tradie a Subscribe screen)
 *   legacy_none   no sub, legacy NULL plan_state       → "No active subscription" / View Plans
 *   past_due      sub past_due — value-gated dunning (plan_state past_due, full access) AND the
 *                 legacy past-due takeover share this value; branch on planState for copy
 *   cancelled     sub cancelled                        → Resubscribe
 *   grace         live (trialing) sub, plan_state grace → active page + grace banner
 *   active        everything else with a live sub
 */
export type BillingView =
  | 'free'
  | 'grace'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'founding_free'
  | 'legacy_none'
  | 'cancelled';

export interface BillingViewInput {
  /** profile.stripe_subscription_id present. */
  hasSubscription: boolean;
  planState: PlanState | null;
  subscriptionStatus: SubscriptionStatusType | string | null;
}

export function billingView(input: BillingViewInput): BillingView {
  const { hasSubscription, planState, subscriptionStatus } = input;
  if (!hasSubscription) {
    if (planState === 'paused') return 'paused';
    if (planState === 'free') return 'free';
    if (planState === 'founding_free') return 'founding_free';
    return 'legacy_none';
  }
  if (subscriptionStatus === 'past_due') return 'past_due';
  if (subscriptionStatus === 'cancelled') return 'cancelled';
  return planState === 'grace' ? 'grace' : 'active';
}

/** Enquiry meter for the free view: 0–100, capped. */
export function contactMeterPercent(
  qualifiedContactCount: number,
  threshold: number = CONTACT_THRESHOLD,
): number {
  return Math.min(100, Math.round((qualifiedContactCount / threshold) * 100));
}

export interface PlanDisplay {
  /** `${tier.name} plan` */
  name: string;
  /** Formatted hero price — Stripe's actual amount when known, else the tier price. */
  price: string;
  period: 'month' | 'year';
  perks: string[];
}

export function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amountCents / 100);
}

/**
 * The plan hero. The price is what Stripe ACTUALLY bills when billing-details
 * knows it — legacy band subs map to no tier and showing the tier-config
 * price contradicted the invoices below.
 */
export function getPlanDisplay(
  tier: TradieTier,
  interval: BillingInterval,
  stripeAmountCents: number | null = null,
  currency: string | null = null,
): PlanDisplay {
  const price =
    stripeAmountCents != null
      ? formatCurrency(stripeAmountCents, currency ?? 'aud')
      : interval === 'monthly'
        ? `$${tier.monthly}`
        : `$${tier.annual.toLocaleString('en-AU')}`;
  return {
    name: `${tier.name} plan`,
    price,
    period: interval === 'monthly' ? 'month' : 'year',
    perks: tier.features,
  };
}

/**
 * Show the "upgrade to annual" banner? Monthly only, not cancelling, annual
 * genuinely beats 12× the REAL monthly amount, and the sub is on a real tier
 * so swap-plan will accept it (legacy-band subs are refused by the route).
 */
export function annualUpgradeEligible(input: {
  interval: BillingInterval;
  cancelAtPeriodEnd: boolean;
  tier: TradieTier;
  stripeAmountCents: number | null;
  canSwapPlan: boolean | undefined;
}): { eligible: boolean; savings: number; actualMonthly: number } {
  const actualMonthly =
    input.interval === 'monthly' && input.stripeAmountCents != null
      ? input.stripeAmountCents / 100
      : input.tier.monthly;
  const savings = annualSavings(actualMonthly, input.tier.annual);
  const eligible =
    !input.cancelAtPeriodEnd &&
    input.interval === 'monthly' &&
    savings > 0 &&
    input.canSwapPlan === true;
  return { eligible, savings, actualMonthly };
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export interface BillingState {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  profile: BillingProfile | null;
  /** value_gated_billing intake flag; null while the GET is in flight. */
  flagEnabled: boolean | null;
  planState: PlanState | null;
  qualifiedContactCount: number;
  threshold: number;
  graceEndsAt: string | null;
  cardOnFileAt: string | null;
  cardRequiredAt: string | null;
  /** Resolved interval (Stripe → subscription_plan → billing_interval → monthly). */
  billingInterval: BillingInterval;
  subscription: SubscriptionDetails | null;
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
  hasSubscription: boolean;
  subscriptionStatus: SubscriptionStatusType | null;
  cancelAtPeriodEnd: boolean;
  tier: TradieTierKey;
  tierDefinition: TradieTier;
  view: BillingView;
  acceptingEnquiries: boolean;
  hasPortalAccess: boolean;
}

/** The website's catch-all toast when billing details fail to load. */
export const BILLING_LOAD_ERROR = "Couldn't load billing details.";

/**
 * Everything /portal/billing renders, loaded the way the website page does:
 * own row → (sub id ? billing-details : status active ? sync then retry) →
 * card-step flag. Re-runs on profile-changed events.
 */
export function useBillingState(): BillingState {
  const { user, loading: authLoading } = useUser();
  const uid = user?.id ?? null;
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [billing, setBilling] = useState<BillingDetails | null>(null);
  const [flagEnabled, setFlagEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setBilling(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [row, flag] = await Promise.all([getOwnBillingProfile(uid), fetchCardStepEnabled()]);
      setFlagEnabled(flag);
      let prof = row;
      let details: BillingDetails | null = null;
      if (prof?.stripe_subscription_id) {
        details = await fetchBillingDetails();
      } else if (prof && (prof.subscription_status === 'active' || prof.status === 'active')) {
        // Status active but no subscription id in the DB — the website tries a
        // Stripe sync, then re-reads the row and fetches billing details.
        try {
          await syncFromStripe();
          prof = await getOwnBillingProfile(uid);
          if (prof?.stripe_subscription_id) details = await fetchBillingDetails();
        } catch {
          // Sync unavailable — fall back to the DB-only view, as the website does.
        }
      }
      setProfile(prof);
      setBilling(details);
    } catch (e) {
      setError(e instanceof Error ? e.message : BILLING_LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (authLoading) return;
    void load();
    return onProfileChanged(() => {
      void load();
    });
  }, [authLoading, load]);

  return useMemo<BillingState>(() => {
    const subscription = billing?.subscription ?? null;
    const hasSubscription = !!profile?.stripe_subscription_id;
    const billingInterval = resolveBillingInterval(
      subscription?.interval,
      profile?.subscription_plan,
      profile?.billing_interval,
    );
    const tierDefinition = resolveTier(
      subscription?.tier ?? profile?.subscription_tier,
      profile?.trade_categories,
      profile?.trade_category,
    );
    return {
      loading: authLoading || loading,
      error,
      refresh: load,
      profile,
      flagEnabled,
      planState: profile?.plan_state ?? null,
      qualifiedContactCount: profile?.qualified_contact_count ?? 0,
      threshold: CONTACT_THRESHOLD,
      graceEndsAt: profile?.grace_ends_at ?? null,
      cardOnFileAt: profile?.card_on_file_at ?? null,
      cardRequiredAt: profile?.card_required_at ?? null,
      billingInterval,
      subscription,
      paymentMethod: billing?.paymentMethod ?? null,
      invoices: billing?.invoices ?? [],
      hasSubscription,
      subscriptionStatus: profile?.subscription_status ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      tier: tierDefinition.key,
      tierDefinition,
      view: billingView({
        hasSubscription,
        planState: profile?.plan_state ?? null,
        subscriptionStatus: profile?.subscription_status ?? null,
      }),
      acceptingEnquiries: profile ? acceptsNewEnquiries(profile) : false,
      hasPortalAccess: profile ? hasPortalAccess(profile) : false,
    };
  }, [authLoading, loading, error, load, profile, billing, flagEnabled]);
}

/* ── Tradie actions ─────────────────────────────────────────────────── */

/** Soft cancel — access stays until current_period_end (native-actions.tsx). */
export async function cancelSubscription(): Promise<SubscriptionToggleResult> {
  return api.post<SubscriptionToggleResult>('/api/stripe/cancel-subscription');
}

/** Clear cancel_at_period_end while the sub is still active. */
export async function resumeSubscription(): Promise<SubscriptionToggleResult> {
  return api.post<SubscriptionToggleResult>('/api/stripe/resume-subscription');
}

/**
 * Swap monthly ↔ annual on the SAME tier (Stripe prorates). Throws ApiError
 * with the route's message for legacy-band subs, same-interval swaps, or an
 * inactive sub. Gate behind CAN_SELL_IN_APP.
 */
export async function swapPlan(plan: BillingInterval): Promise<SwapPlanResult> {
  return api.post<SwapPlanResult>('/api/stripe/swap-plan', { plan });
}

/**
 * paused → active: charges the saved card immediately (no trial). 402 →
 * CardDeclinedError; 400 (no card / other) → ApiError with the route's copy.
 * Gate behind CAN_SELL_IN_APP.
 */
export async function reactivate(): Promise<ReactivateResult> {
  try {
    return await api.post<ReactivateResult>('/api/billing/reactivate');
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) {
      throw new CardDeclinedError(e.message || CARD_DECLINED_MESSAGE);
    }
    throw e;
  }
}

/* ── Enterprise actions ─────────────────────────────────────────────── */

/** Live cancel/renew state + default card for the enterprise subscription. */
export async function getEnterpriseSubscriptionState(): Promise<EnterpriseSubscriptionState> {
  return api.get<EnterpriseSubscriptionState>('/api/stripe/enterprise-subscription-state');
}

/** Soft-cancel the enterprise subscription at period end. */
export async function cancelEnterprise(): Promise<EnterpriseCancelResult> {
  return api.post<EnterpriseCancelResult>('/api/stripe/enterprise-cancel');
}

/** Clear cancel_at_period_end on the enterprise subscription. */
export async function resumeEnterprise(): Promise<EnterpriseResumeResult> {
  return api.post<EnterpriseResumeResult>('/api/stripe/enterprise-resume');
}

/**
 * Builder ↔ Contractor swap on the existing subscription (Stripe prorates).
 * The website always sends interval "monthly". Gate behind CAN_SELL_IN_APP.
 */
export async function swapEnterpriseTier(
  tier: 'builder' | 'contractor',
  interval: BillingInterval = 'monthly',
): Promise<EnterpriseSwapTierResult> {
  return api.post<EnterpriseSwapTierResult>('/api/stripe/enterprise-swap-tier', { tier, interval });
}

/** The legacy enterprise_subscriptions.plan vocabulary → user-facing tier key. */
export function enterpriseTierFromPlan(
  plan: Database['public']['Tables']['enterprise_subscriptions']['Row']['plan'] | string | null | undefined,
): 'builder' | 'contractor' | null {
  if (plan === 'unlimited') return 'contractor';
  if (plan === 'starter') return 'builder';
  return null;
}
