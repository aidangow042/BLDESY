import { describe, expect, it, vi } from 'vitest';

import {
  buildJobRows,
  compareBars,
  computeAnalyticsMetrics,
  dailyApplications,
  EMPTY_ENTERPRISE_METRICS,
  fmtDate,
  MAX_COMPARE,
  periodCutoff,
  rankApplicantOrigins,
  relTime,
  sortJobRows,
  toggleCompareId,
  type AnalyticsAppInput,
  type AnalyticsJobInput,
} from '@/lib/enterprise-hub/analytics';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));

const NOW = new Date('2026-08-31T10:00:00Z').getTime();

const jobs: AnalyticsJobInput[] = [
  { id: 'a', title: 'A', trade_category: 'plumber', suburb: 'Newtown', status: 'open', workers_needed: 2, created_at: '2026-08-01T00:00:00Z' },
  { id: 'b', title: 'B', trade_category: 'electrician', suburb: 'Glebe', status: 'closed', workers_needed: null, created_at: '2026-08-02T00:00:00Z' },
];
const apps: AnalyticsAppInput[] = [
  { id: '1', status: 'accepted', created_at: '2026-08-10T09:00:00Z', job_id: 'a', builder_id: 'b1' },
  { id: '2', status: 'pending', created_at: '2026-08-10T12:00:00Z', job_id: 'a', builder_id: 'b2' },
  { id: '3', status: 'rejected', created_at: '2026-08-11T12:00:00Z', job_id: 'a', builder_id: 'b1' },
];
const views = [
  { job_id: 'a', created_at: '2026-08-09T00:00:00Z' },
  { job_id: 'a', created_at: '2026-08-09T01:00:00Z' },
  { job_id: 'b', created_at: '2026-08-09T02:00:00Z' },
  { job_id: 'a', created_at: '2026-08-09T03:00:00Z' },
];

describe('periodCutoff / fmtDate / relTime', () => {
  it('cutoffs relative to now, null for all time', () => {
    expect(periodCutoff('all', NOW)).toBeNull();
    expect(periodCutoff('7d', NOW)).toBe(new Date(NOW - 7 * 86_400_000).toISOString());
    expect(periodCutoff('90d', NOW)).toBe(new Date(NOW - 90 * 86_400_000).toISOString());
  });
  it('labels', () => {
    expect(fmtDate('2026-08-14')).toMatch(/^14 Aug$/);
    expect(relTime(null, NOW)).toBe('—');
    expect(relTime(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('5m');
    expect(relTime(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe('3h');
    expect(relTime(new Date(NOW - 2 * 86_400_000).toISOString(), NOW)).toBe('2d');
  });
});

describe('computeAnalyticsMetrics', () => {
  it('matches the page maths (workers_needed || 1, 1-decimal avg)', () => {
    const m = computeAnalyticsMetrics(jobs, apps, views.length);
    expect(m).toEqual({
      jobViews: 4,
      applications: 3,
      viewToApplyRate: 75,
      fillRate: 33, // 1 accepted / (2 + 1) positions
      jobsPosted: 2,
      avgAppsPerJob: 1.5,
      positionsFilled: 1,
      workersNeeded: 3,
    });
  });
  it('empty input is the EMPTY constant', () => {
    expect(computeAnalyticsMetrics([], [], 0)).toEqual(EMPTY_ENTERPRISE_METRICS);
  });
});

describe('dailyApplications + rankApplicantOrigins', () => {
  it('groups per UTC day ascending', () => {
    expect(dailyApplications(apps)).toEqual([
      { date: fmtDate('2026-08-10'), count: 2 },
      { date: fmtDate('2026-08-11'), count: 1 },
    ]);
  });
  it('ranks trades / suburbs with Unknown for missing profiles', () => {
    const origins = new Map([['b1', { trade: 'plumber', suburb: 'Newtown' }]]);
    expect(rankApplicantOrigins(apps, origins, 'trade')).toEqual([
      { name: 'plumber', count: 2 },
      { name: 'Unknown', count: 1 },
    ]);
    expect(rankApplicantOrigins(apps, origins, 'suburb', 1)).toEqual([{ name: 'Newtown', count: 2 }]);
  });
});

describe('job rows', () => {
  const rows = buildJobRows(jobs, apps, views);
  it('per-job apps / views / fill / first application, most apps first', () => {
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rows[0]).toMatchObject({ apps: 3, views: 3, fillRate: 50, firstApp: '2026-08-10T09:00:00Z', workers_needed: 2 });
    expect(rows[1]).toMatchObject({ apps: 0, views: 1, fillRate: 0, firstApp: null, workers_needed: 1 });
  });
  it('sorts by views / fill / apps', () => {
    expect(sortJobRows(rows, 'views').map((r) => r.id)).toEqual(['a', 'b']);
    expect(sortJobRows([...rows].reverse(), 'apps').map((r) => r.id)).toEqual(['a', 'b']);
    expect(sortJobRows(rows, 'fill')[0].id).toBe('a');
  });
  it('compare selection caps at three and bars floor at 3%', () => {
    expect(toggleCompareId([], 'a')).toEqual(['a']);
    expect(toggleCompareId(['a'], 'a')).toEqual([]);
    expect(toggleCompareId(['1', '2', '3'], '4')).toEqual(['1', '2', '3']);
    expect(MAX_COMPARE).toBe(3);
    expect(compareBars(rows, ['a', 'b'], 'apps')).toEqual([
      { id: 'a', value: 3, pct: 100 },
      { id: 'b', value: 0, pct: 3 },
    ]);
    expect(compareBars(rows, ['b'], 'views')).toEqual([{ id: 'b', value: 1, pct: 100 }]);
  });
});
