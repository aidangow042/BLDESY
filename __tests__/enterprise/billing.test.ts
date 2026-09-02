import { describe, expect, it } from 'vitest';

import {
  cancelUntilLabel,
  cardExpiryLabel,
  enterprisePlanPerks,
  formatPaymentAmount,
  formatStripeDate,
  paymentDescription,
  paymentStatusLabel,
  paymentStatusTone,
  periodEndLabel,
  planTierKey,
  tierDisplayName,
  tierPrice,
  tierSwapPreview,
} from '@/lib/enterprise-hub/billing';
import { ENTERPRISE_TIERS } from '@/lib/web/pricing-tiers-client';

describe('legacy plan vocabulary → tier', () => {
  it('unlimited = Contractor, anything else = Builder', () => {
    expect(planTierKey('unlimited')).toBe('contractor');
    expect(planTierKey('starter')).toBe('builder');
    expect(planTierKey(null)).toBe('builder');
    expect(tierDisplayName('unlimited')).toBe('Contractor');
    expect(tierDisplayName('starter')).toBe('Builder');
    expect(tierPrice('unlimited')).toBe(299);
    expect(tierPrice('starter')).toBe(129);
  });
  it('perks come from the shared tier list', () => {
    expect(enterprisePlanPerks('unlimited')).toEqual(ENTERPRISE_TIERS.find((t) => t.key === 'contractor')!.features);
    expect(enterprisePlanPerks('starter')).toEqual(ENTERPRISE_TIERS.find((t) => t.key === 'builder')!.features);
  });
});

describe('dates', () => {
  it('formatStripeDate handles unix seconds and absence', () => {
    expect(formatStripeDate(null)).toBeNull();
    expect(formatStripeDate(0)).toBeNull();
    expect(formatStripeDate(Math.floor(new Date('2026-08-12T00:00:00').getTime() / 1000))).toBe('12 Aug 2026');
  });
  it('periodEndLabel prefers Stripe, falls back to the DB row', () => {
    const ts = Math.floor(new Date('2026-09-01T00:00:00').getTime() / 1000);
    expect(periodEndLabel(ts, '2026-10-01T00:00:00')).toBe('1 Sept 2026');
    expect(periodEndLabel(null, '2026-10-01T00:00:00')).toBe('1 Oct 2026');
    expect(periodEndLabel(null, null)).toBeNull();
    expect(cancelUntilLabel(null, null)).toBe('the end of your current billing period');
  });
});

describe('payment history', () => {
  it('description / amount / status', () => {
    expect(paymentDescription('subscription')).toBe('Subscription payment');
    expect(paymentDescription('single_post')).toBe('Job post payment');
    expect(formatPaymentAmount(12900)).toBe('$129.00');
    expect(paymentStatusLabel('succeeded')).toBe('Succeeded');
    expect(paymentStatusTone('succeeded')).toBe('success');
    expect(paymentStatusTone('failed')).toBe('error');
    expect(paymentStatusTone('pending')).toBe('warning');
    expect(cardExpiryLabel(3, 2028)).toBe('Expires 03/2028');
  });
});

describe('tierSwapPreview', () => {
  it('builder → contractor is an upgrade', () => {
    const p = tierSwapPreview('starter', 'contractor');
    expect(p.isUpgrade).toBe(true);
    expect(p.title).toBe('Upgrade to Contractor');
    expect(p.confirmLabel).toBe('Confirm upgrade');
    expect(p.busyLabel).toBe('Upgrading…');
    expect(p.currentTier?.key).toBe('builder');
    expect(p.targetTier?.key).toBe('contractor');
  });
  it('contractor → builder is a switch', () => {
    const p = tierSwapPreview('unlimited', 'builder');
    expect(p.isUpgrade).toBe(false);
    expect(p.title).toBe('Switch to Builder');
    expect(p.confirmLabel).toBe('Confirm switch');
    expect(p.busyLabel).toBe('Switching…');
  });
});
