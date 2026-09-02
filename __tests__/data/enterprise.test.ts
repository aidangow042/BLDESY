import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  aggregateApplicantRatings,
  computeEnterpriseMetrics,
  countApplicantsByJob,
  enterpriseTierFromPlan,
  jobHasRequirements,
  postsUsedPercent,
  sortApplicants,
} from '@/lib/data/enterprise';
import { emptyCapabilities } from '@/lib/web/capabilities';
import { computeMatch } from '@/lib/web/match';

describe('countApplicantsByJob', () => {
  it('totals and accepted per job', () => {
    expect(
      countApplicantsByJob([
        { job_id: 'a', status: 'pending' },
        { job_id: 'a', status: 'accepted' },
        { job_id: 'b', status: 'rejected' },
      ]),
    ).toEqual({ a: { applicant_count: 2, accepted_count: 1 }, b: { applicant_count: 1, accepted_count: 0 } });
  });
});

describe('computeEnterpriseMetrics', () => {
  const now = new Date('2026-08-31T10:00:00');
  const jobs = [
    { id: 'open', status: 'open', workers_needed: 2, created_at: '2026-08-21T00:00:00', applicant_count: 5, accepted_count: 2 },
    { id: 'prog', status: 'in_progress', workers_needed: 1, created_at: '2026-08-26T00:00:00', applicant_count: 1, accepted_count: 1 },
    { id: 'closed', status: 'closed', workers_needed: 3, created_at: '2026-08-01T00:00:00', applicant_count: 0, accepted_count: 0 },
  ];
  const apps = [
    { job_id: 'open', status: 'pending', created_at: '2026-08-31T08:00:00' },
    { job_id: 'open', status: 'pending', created_at: '2026-08-30T23:00:00' },
  ];
  const m = computeEnterpriseMetrics(jobs, apps, now);

  it('active / open / in progress / posted', () => {
    expect(m.activeJobs).toBe(2);
    expect(m.openJobs).toBe(1);
    expect(m.inProgressJobs).toBe(1);
    expect(m.totalPosted).toBe(3);
  });
  it('applicants, hired, fill rate, apps today, avg apps/job', () => {
    expect(m.totalApplicants).toBe(6);
    expect(m.totalAccepted).toBe(3);
    expect(m.totalWorkersNeeded).toBe(6);
    expect(m.fillRate).toBe(50);
    expect(m.appsToday).toBe(1);
    expect(m.avgAppsPerJob).toBe(2);
  });
  it('avg time to fill over filled jobs (whole days since posting), top jobs by applicants', () => {
    expect(m.filledJobs).toBe(2); // open (2/2) + prog (1/1)
    expect(m.avgTimeToFillDays).toBe(Math.round((10 + 5) / 2));
    expect(m.topJobIds).toEqual(['open', 'prog', 'closed']);
    expect(computeEnterpriseMetrics([], [], now).avgTimeToFillDays).toBeNull();
    expect(computeEnterpriseMetrics([], [], now).fillRate).toBe(0);
  });
});

describe('aggregateApplicantRatings', () => {
  it('sums per reviewee', () => {
    expect(
      aggregateApplicantRatings([
        { reviewee_id: 'a', rating: 5 },
        { reviewee_id: 'a', rating: 3 },
        { reviewee_id: 'b', rating: 4 },
      ]),
    ).toEqual({ a: { sum: 8, count: 2 }, b: { sum: 4, count: 1 } });
  });
});

describe('sortApplicants', () => {
  const reqs = { white_card: 'required' as const, first_aid: 'required' as const };
  const full = computeMatch({ ...emptyCapabilities('f'), white_card: true, first_aid: true }, reqs, null);
  const half = computeMatch({ ...emptyCapabilities('h'), white_card: true }, reqs, null);
  const none = computeMatch(null, reqs, null);
  const applicants = [
    { id: 'none-new', match: none, averageRating: 5, created_at: '2026-08-03T00:00:00Z' },
    { id: 'half', match: half, averageRating: 0, created_at: '2026-08-02T00:00:00Z' },
    { id: 'full-old', match: full, averageRating: 4, created_at: '2026-08-01T00:00:00Z' },
    { id: 'full-new', match: full, averageRating: 4, created_at: '2026-08-02T12:00:00Z' },
  ];

  it('best match: ratio of met required, then newest', () => {
    expect(sortApplicants(applicants, 'best_match').map((a) => a.id)).toEqual([
      'full-new',
      'full-old',
      'half',
      'none-new',
    ]);
  });
  it('highest rated: rating then newest; most recent keeps fetch order', () => {
    expect(sortApplicants(applicants, 'highest_rated').map((a) => a.id)).toEqual([
      'none-new',
      'full-new',
      'full-old',
      'half',
    ]);
    expect(sortApplicants(applicants, 'most_recent').map((a) => a.id)).toEqual(applicants.map((a) => a.id));
  });
  it('only full matches filter', () => {
    expect(sortApplicants(applicants, 'most_recent', true).map((a) => a.id)).toEqual(['full-old', 'full-new']);
  });
});

describe('small helpers', () => {
  it('jobHasRequirements', () => {
    expect(jobHasRequirements({ required_capabilities: {}, min_public_liability: null })).toBe(false);
    expect(jobHasRequirements({ required_capabilities: { ppe: 'preferred' }, min_public_liability: null })).toBe(true);
    expect(jobHasRequirements({ required_capabilities: {}, min_public_liability: 5_000_000 })).toBe(true);
    expect(jobHasRequirements(null)).toBe(false);
  });
  it('postsUsedPercent only for the starter plan', () => {
    expect(postsUsedPercent({ plan: 'starter', posts_limit: 5, posts_used_this_cycle: 2 })).toBe(40);
    expect(postsUsedPercent({ plan: 'starter', posts_limit: 5, posts_used_this_cycle: 9 })).toBe(100);
    expect(postsUsedPercent({ plan: 'unlimited', posts_limit: null, posts_used_this_cycle: 9 })).toBe(0);
  });
  it('enterpriseTierFromPlan is re-exported', () => {
    expect(enterpriseTierFromPlan('unlimited')).toBe('contractor');
  });
});
