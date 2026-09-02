import { describe, expect, it, vi } from 'vitest';

import {
  attachReviewers,
  emptyReviewsResult,
  publicBuilderProfileSelect,
  stripContactPii,
  summariseReviews,
  type ReviewRow,
} from '@/lib/data/builders';

vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));
vi.mock('@/lib/auth-context', () => import('./mocks/auth-context-mock'));

describe('publicBuilderProfileSelect', () => {
  it('mirrors the website PROFILE_SELECT — view columns only, accepting_enquiries last', () => {
    const cols = publicBuilderProfileSelect.split(', ');
    expect(cols[0]).toBe('user_id');
    expect(cols[cols.length - 1]).toBe('accepting_enquiries');
    expect(cols).toEqual(
      expect.arrayContaining(['slug', 'phone', 'email', 'website', 'profile_visibility', 'occupied_dates', 'availability_display_mode', 'display_bldesy_score']),
    );
    expect(publicBuilderProfileSelect).not.toMatch(/plan_state|subscription_|stripe_|status\b/);
  });
});

describe('stripContactPii', () => {
  const row = { phone: '0400000000', email: 'a@b.c', business_name: 'X' };

  it('nulls phone + email for guests / anonymous sessions', () => {
    expect(stripContactPii(row, false)).toEqual({ phone: null, email: null, business_name: 'X' });
  });

  it('leaves a signed-in caller untouched (same object)', () => {
    expect(stripContactPii(row, true)).toBe(row);
  });
});

describe('summariseReviews', () => {
  it('averages and buckets ratings into a 1..5 histogram', () => {
    const s = summariseReviews([{ rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 1 }]);
    expect(s.totalReviews).toBe(4);
    expect(s.averageRating).toBe(3.5);
    expect(s.starBreakdown).toEqual({ 1: 1, 2: 0, 3: 0, 4: 2, 5: 1 });
  });

  it('rounds and clamps out-of-range ratings, and handles the empty case', () => {
    const s = summariseReviews([{ rating: 4.6 }, { rating: 0 }, { rating: 9 }]);
    expect(s.starBreakdown).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 2 });
    expect(summariseReviews([])).toEqual({ averageRating: 0, totalReviews: 0, starBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });

  it('emptyReviewsResult returns a fresh object each time', () => {
    const a = emptyReviewsResult();
    a.starBreakdown[5] = 9;
    expect(emptyReviewsResult().starBreakdown[5]).toBe(0);
  });
});

describe('attachReviewers', () => {
  const rows: ReviewRow[] = [
    { id: 'r1', job_id: 'j', reviewer_id: 'u1', reviewee_id: 't', rating: 5, comment: null, created_at: '2026-01-01' },
    { id: 'r2', job_id: 'j', reviewer_id: 'u2', reviewee_id: 't', rating: 3, comment: 'ok', created_at: '2026-01-02' },
  ];

  it('joins public_profiles by reviewer_id and nulls unknown reviewers', () => {
    const out = attachReviewers(rows, [{ id: 'u1', name: 'Sam', avatar_url: 'https://x/a.png' }]);
    expect(out[0].profiles).toEqual({ name: 'Sam', avatar_url: 'https://x/a.png' });
    expect(out[1].profiles).toBeNull();
    expect(out[1].comment).toBe('ok');
  });
});
