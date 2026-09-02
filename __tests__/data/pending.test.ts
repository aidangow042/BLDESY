import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));

import {
  derivePendingAction,
  improvementTips,
  pendingTradesFor,
  resolvePendingAction,
  scoreRevealFrom,
  shouldPollVerification,
  verificationProgressed,
  type PendingBuilderRow,
} from '@/lib/data/pending';

const approvedFree: PendingBuilderRow = {
  status: 'approved',
  rejection_reason: null,
  stripe_subscription_id: null,
  trade_category: 'plumber',
  trade_categories: null,
  bldesy_review_status: 'clean',
  email: 'a@b.co',
  phone: null,
  plan_state: 'free',
  card_on_file_at: null,
  bldesy_score: 72,
  bldesy_score_breakdown: null,
};
const realUser = { is_anonymous: false, email: 'a@b.co' };

describe('resolvePendingAction (verbatim web decision)', () => {
  it('anonymous account with no contact → activate, regardless of billing state', () => {
    expect(resolvePendingAction(approvedFree, { is_anonymous: true }, true)).toBe('activate');
    expect(resolvePendingAction(approvedFree, { is_anonymous: true, phone: '+61412345678' }, true)).toBe(
      'card_step',
    );
  });
  it('legacy NULL plan_state: plan picker without a sub, null (historical screens) with one', () => {
    expect(resolvePendingAction({ ...approvedFree, plan_state: null }, realUser, null)).toBe('plan_picker');
    expect(
      resolvePendingAction({ ...approvedFree, plan_state: null, stripe_subscription_id: 'sub_1' }, realUser, null),
    ).toBeNull();
  });
  it('a live subscription, a non-free state or a card on file → portal', () => {
    expect(resolvePendingAction({ ...approvedFree, stripe_subscription_id: 'sub_1' }, realUser, true)).toBe('portal');
    expect(resolvePendingAction({ ...approvedFree, plan_state: 'grace' }, realUser, true)).toBe('portal');
    expect(resolvePendingAction({ ...approvedFree, plan_state: 'founding_free' }, realUser, true)).toBe('portal');
    expect(resolvePendingAction({ ...approvedFree, card_on_file_at: '2026-08-01' }, realUser, true)).toBe('portal');
  });
  it('free, no card: card_step when the flag is ON, await_flag while unknown, portal when OFF', () => {
    expect(resolvePendingAction(approvedFree, realUser, true)).toBe('card_step');
    expect(resolvePendingAction(approvedFree, realUser, null)).toBe('await_flag');
    expect(resolvePendingAction(approvedFree, realUser, false)).toBe('portal');
  });
});

describe('derivePendingAction (page render order)', () => {
  it('active → portal; suspended → suspended', () => {
    expect(derivePendingAction({ ...approvedFree, status: 'active' }, realUser, true)).toBe('portal');
    expect(derivePendingAction({ ...approvedFree, status: 'suspended' }, realUser, true)).toBe('suspended');
  });
  it('approved rows use resolvePendingAction; a legacy row WITH a sub falls through', () => {
    expect(derivePendingAction(approvedFree, realUser, true)).toBe('card_step');
    expect(derivePendingAction(approvedFree, realUser, null)).toBe('await_flag');
    expect(
      derivePendingAction(
        { ...approvedFree, plan_state: null, stripe_subscription_id: 'sub_1', bldesy_review_status: null },
        realUser,
        true,
      ),
    ).toBe('verifying');
  });
  it('declined > rejected > flagged > verifying', () => {
    const pending: PendingBuilderRow = { ...approvedFree, status: 'pending_review', bldesy_review_status: null };
    expect(derivePendingAction({ ...pending, bldesy_review_status: 'declined', rejection_reason: 'x' }, realUser, true)).toBe(
      'declined',
    );
    expect(derivePendingAction({ ...pending, rejection_reason: 'ABN inactive', bldesy_review_status: 'flagged' }, realUser, true)).toBe(
      'rejected',
    );
    expect(derivePendingAction({ ...pending, status: 'rejected' }, realUser, true)).toBe('rejected');
    expect(derivePendingAction({ ...pending, bldesy_review_status: 'flagged' }, realUser, true)).toBe('flagged');
    expect(derivePendingAction(pending, realUser, true)).toBe('verifying');
    expect(derivePendingAction({ ...pending, bldesy_review_status: 'scanning' }, realUser, true)).toBe('verifying');
  });
});

describe('verification poll', () => {
  const pending: PendingBuilderRow = { ...approvedFree, status: 'pending_review', bldesy_review_status: 'pending' };
  it('polls only while pending_review with no reason', () => {
    expect(shouldPollVerification(pending)).toBe(true);
    expect(shouldPollVerification({ ...pending, rejection_reason: 'x' })).toBe(false);
    expect(shouldPollVerification(approvedFree)).toBe(false);
  });
  it('progress = status, reason or review sub-state changed', () => {
    expect(verificationProgressed(pending, pending)).toBe(false);
    expect(verificationProgressed(pending, null)).toBe(false);
    expect(verificationProgressed(pending, { ...pending, status: 'approved' })).toBe(true);
    expect(verificationProgressed(pending, { ...pending, rejection_reason: 'x' })).toBe(true);
    expect(verificationProgressed(pending, { ...pending, bldesy_review_status: 'flagged' })).toBe(true);
  });
});

describe('trades + score reveal', () => {
  it('pendingTradesFor prefers the list', () => {
    expect(pendingTradesFor({ trade_category: 'plumber', trade_categories: ['a'] })).toEqual(['a']);
    expect(pendingTradesFor({ trade_category: 'plumber', trade_categories: [] })).toEqual(['plumber']);
    expect(pendingTradesFor({ trade_category: '', trade_categories: null })).toEqual([]);
  });

  it('improvementTips renders the website copy for improvable items and ONE reputation nudge', () => {
    const tips = improvementTips({
      verification: [
        { key: 'insurance', label: 'Insurance', ok: false, points: 0, max: 15 },
        { key: 'gst_registered', label: 'GST', ok: false, points: 0, max: 5 },
        { key: 'years_in_business', label: 'Years', ok: false, points: 2, max: 10 },
        { key: 'abn', label: 'ABN', ok: true, points: 10, max: 10 },
        { key: 'mystery', label: '?', ok: false, points: 0, max: 3 },
      ],
      reputation: [
        { key: 'google', label: 'Google', ok: false, points: 5, max: 20 },
        { key: 'reviews', label: 'Reviews', ok: false, points: 0, max: 10 },
      ],
      verification_points: 12,
      reputation_points: 5,
    });
    expect(tips.map((t) => t.key)).toEqual(['insurance', 'gst_registered', 'years_in_business', 'reputation']);
    expect(tips[0]).toEqual({
      key: 'insurance',
      text: 'Verify your public liability insurance — +15 pts and a trust badge customers look for.',
      href: '/portal/edit-profile',
    });
    expect(tips[1].text).toBe('+5 pts once your ABN shows GST registration — picked up automatically from the ABR.');
    expect(tips[2].text).toBe('Up to 10 pts as your ABN matures — credited automatically at 2 and 5 years active.');
    expect(tips[3].text).toMatch(/Grow your Google reviews/);
  });

  it('scoreRevealFrom clamps and hides when there is no score', () => {
    expect(scoreRevealFrom({ bldesy_score: null, bldesy_score_breakdown: null })).toBeNull();
    expect(scoreRevealFrom({ bldesy_score: 140, bldesy_score_breakdown: null })).toEqual({
      score: 100,
      breakdown: null,
      tips: [],
    });
  });
});
