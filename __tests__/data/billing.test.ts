import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  annualUpgradeEligible,
  billingView,
  CardDeclinedError,
  contactMeterPercent,
  enterpriseTierFromPlan,
  getPlanDisplay,
  resolveBillingInterval,
  resolveTier,
} from '@/lib/data/billing';
import { tradieTier } from '@/lib/web/pricing-tiers-client';

describe('resolveTier', () => {
  it('trusts a valid tier key first', () => {
    expect(resolveTier('commercial', ['plumber'], 'plumber').key).toBe('commercial');
  });
  it('falls back to pickTierForTrades on the trade list', () => {
    expect(resolveTier(null, ['plumber', 'electrician'], null).key).toBe('specialist');
    expect(resolveTier('nonsense', ['handyman'], null).key).toBe('handyman');
    expect(resolveTier(undefined, [], 'builder').key).toBe('commercial');
  });
  it('defaults to Trade with no trades at all', () => {
    expect(resolveTier(null, null, null).key).toBe('trade');
  });
});

describe('resolveBillingInterval', () => {
  it('prefers the Stripe-derived interval, then subscription_plan, then billing_interval, then monthly', () => {
    expect(resolveBillingInterval('annual', 'monthly', 'monthly')).toBe('annual');
    expect(resolveBillingInterval('week', 'annual', 'monthly')).toBe('annual');
    expect(resolveBillingInterval(null, null, 'annual')).toBe('annual');
    expect(resolveBillingInterval(undefined, undefined, undefined)).toBe('monthly');
  });
});

describe('billingView', () => {
  const noSub = (planState: Parameters<typeof billingView>[0]['planState']) =>
    billingView({ hasSubscription: false, planState, subscriptionStatus: null });

  it('no subscription: paused / free / founding_free / legacy_none', () => {
    expect(noSub('paused')).toBe('paused');
    expect(noSub('free')).toBe('free');
    expect(noSub('founding_free')).toBe('founding_free');
    expect(noSub(null)).toBe('legacy_none');
    expect(noSub('grace')).toBe('legacy_none');
  });

  it('with a subscription: past_due / cancelled / grace / active', () => {
    expect(billingView({ hasSubscription: true, planState: 'past_due', subscriptionStatus: 'past_due' })).toBe(
      'past_due',
    );
    expect(billingView({ hasSubscription: true, planState: null, subscriptionStatus: 'past_due' })).toBe(
      'past_due',
    );
    expect(billingView({ hasSubscription: true, planState: 'active', subscriptionStatus: 'cancelled' })).toBe(
      'cancelled',
    );
    expect(billingView({ hasSubscription: true, planState: 'grace', subscriptionStatus: 'trialing' })).toBe(
      'grace',
    );
    expect(billingView({ hasSubscription: true, planState: 'active', subscriptionStatus: 'active' })).toBe(
      'active',
    );
    // A paused row that somehow still carries a sub id renders the active page (website behaviour).
    expect(billingView({ hasSubscription: true, planState: 'paused', subscriptionStatus: 'active' })).toBe(
      'active',
    );
  });
});

describe('contactMeterPercent', () => {
  it('caps at 100 and rounds', () => {
    expect(contactMeterPercent(0)).toBe(0);
    expect(contactMeterPercent(1)).toBe(33);
    expect(contactMeterPercent(2)).toBe(67);
    expect(contactMeterPercent(5)).toBe(100);
  });
});

describe('getPlanDisplay', () => {
  const trade = tradieTier('trade');
  it('uses the tier price when Stripe has no amount', () => {
    expect(getPlanDisplay(trade, 'monthly')).toMatchObject({ name: 'Trade plan', price: '$39', period: 'month' });
    expect(getPlanDisplay(trade, 'annual').price).toBe('$390');
  });
  it('shows what Stripe actually bills when known', () => {
    expect(getPlanDisplay(trade, 'monthly', 4900, 'aud').price).toBe('$49');
  });
});

describe('annualUpgradeEligible', () => {
  const trade = tradieTier('trade');
  it('monthly, not cancelling, real savings, swappable', () => {
    const r = annualUpgradeEligible({
      interval: 'monthly',
      cancelAtPeriodEnd: false,
      tier: trade,
      stripeAmountCents: null,
      canSwapPlan: true,
    });
    expect(r).toEqual({ eligible: true, savings: 78, actualMonthly: 39 });
  });
  it('uses the real Stripe monthly amount and refuses legacy-band subs', () => {
    const legacy = annualUpgradeEligible({
      interval: 'monthly',
      cancelAtPeriodEnd: false,
      tier: trade,
      stripeAmountCents: 4900,
      canSwapPlan: false,
    });
    expect(legacy.actualMonthly).toBe(49);
    expect(legacy.savings).toBe(198);
    expect(legacy.eligible).toBe(false);
    expect(
      annualUpgradeEligible({
        interval: 'annual',
        cancelAtPeriodEnd: false,
        tier: trade,
        stripeAmountCents: null,
        canSwapPlan: true,
      }).eligible,
    ).toBe(false);
    expect(
      annualUpgradeEligible({
        interval: 'monthly',
        cancelAtPeriodEnd: true,
        tier: trade,
        stripeAmountCents: null,
        canSwapPlan: true,
      }).eligible,
    ).toBe(false);
  });
});

describe('errors + enterprise plan mapping', () => {
  it('CardDeclinedError carries 402 and the website copy', () => {
    const e = new CardDeclinedError();
    expect(e.status).toBe(402);
    expect(e.message).toMatch(/declined/);
  });
  it('maps legacy plan vocab to tier keys', () => {
    expect(enterpriseTierFromPlan('unlimited')).toBe('contractor');
    expect(enterpriseTierFromPlan('starter')).toBe('builder');
    expect(enterpriseTierFromPlan(null)).toBeNull();
  });
});
