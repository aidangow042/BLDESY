import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  aggregateApplications,
  averageRating,
  dailyApplicationCounts,
  periodCutoff,
  topCounts,
} from '@/lib/data/analytics';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0); // 2026-08-31T12:00Z

describe('periodCutoff', () => {
  it('subtracts whole days from now; all-time is null', () => {
    expect(periodCutoff('7d', NOW)).toBe(new Date(NOW - 7 * 86_400_000).toISOString());
    expect(periodCutoff('30d', NOW)).toBe('2026-08-01T12:00:00.000Z');
    expect(periodCutoff('90d', NOW)).toBe(new Date(NOW - 90 * 86_400_000).toISOString());
    expect(periodCutoff('all', NOW)).toBeNull();
  });
});

const apps = [
  { id: '1', status: 'accepted', created_at: '2026-08-02T09:00:00Z', job_id: 'j1' },
  { id: '2', status: 'pending', created_at: '2026-08-02T18:00:00Z', job_id: 'j2' },
  { id: '3', status: 'rejected', created_at: '2026-08-01T01:00:00Z', job_id: 'j3' },
  { id: '4', status: 'accepted', created_at: '2026-08-03T01:00:00Z', job_id: 'j1' },
];

describe('aggregateApplications', () => {
  it('won = accepted, win rate = accepted ÷ applied', () => {
    expect(aggregateApplications(apps)).toEqual({ totalApplications: 4, jobsWon: 2, winRate: 50 });
    expect(aggregateApplications([])).toEqual({ totalApplications: 0, jobsWon: 0, winRate: 0 });
  });
});

describe('dailyApplicationCounts', () => {
  it('groups by the UTC day and sorts ascending', () => {
    expect(dailyApplicationCounts(apps)).toEqual([
      { date: '2026-08-01', count: 1 },
      { date: '2026-08-02', count: 2 },
      { date: '2026-08-03', count: 1 },
    ]);
  });
});

describe('topCounts', () => {
  const jobs = [
    { id: 'j1', trade_category: 'plumber', suburb: 'Newtown' },
    { id: 'j2', trade_category: 'gas-fitter', suburb: 'Newtown' },
    // j3 missing → skipped
  ];
  it('counts per job field across applications, most first, top N', () => {
    expect(topCounts(apps, jobs, 'trade_category')).toEqual([
      { name: 'plumber', count: 2 },
      { name: 'gas-fitter', count: 1 },
    ]);
    expect(topCounts(apps, jobs, 'suburb')).toEqual([{ name: 'Newtown', count: 3 }]);
    expect(topCounts(apps, jobs, 'trade_category', 1)).toEqual([{ name: 'plumber', count: 2 }]);
  });
});

describe('averageRating', () => {
  it('rounds to one decimal; no reviews → 0 with count 0', () => {
    expect(averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ reviewCount: 3, avgRating: 4.3 });
    expect(averageRating([])).toEqual({ reviewCount: 0, avgRating: 0 });
  });
});
