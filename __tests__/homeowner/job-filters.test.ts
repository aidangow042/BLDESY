import { describe, expect, it, vi } from 'vitest';

import {
  INITIAL_BROWSE_STATE,
  POSTER_TYPE_PILLS,
  URGENCY_PILLS,
  isIndigoPoster,
  pageLabel,
  resultsCountLabel,
  toSearchFilters,
  totalPages,
} from '@/components/jobs/job-filters';

vi.mock('@/lib/api', () => import('../data/mocks/api-mock'));
vi.mock('@/lib/supabase', () => import('../data/mocks/supabase-mock'));

describe('/jobs pills', () => {
  it('are the website labels in order', () => {
    expect(POSTER_TYPE_PILLS.map((p) => p.label)).toEqual(['All Jobs', 'Project', 'Contract', 'Home']);
    expect(URGENCY_PILLS.map((p) => p.label)).toEqual(['Any urgency', 'ASAP', 'This Week', 'Flexible']);
  });

  it('Project and Contract are indigo when active', () => {
    expect(isIndigoPoster('commercial')).toBe(true);
    expect(isIndigoPoster('contract')).toBe(true);
    expect(isIndigoPoster('all')).toBe(false);
    expect(isIndigoPoster('residential')).toBe(false);
  });
});

describe('filters → searchJobs', () => {
  it('trims text and passes the page through', () => {
    expect(toSearchFilters({ ...INITIAL_BROWSE_STATE, keywords: ' tap ', location: ' 2026 ', type: 'residential', page: 3 })).toEqual({
      keywords: 'tap',
      trade: '',
      location: '2026',
      urgency: '',
      posterType: 'residential',
      page: 3,
    });
  });
});

describe('labels', () => {
  it('results count pluralises and quotes the keywords', () => {
    expect(resultsCountLabel(0, '')).toBe('0 jobs found');
    expect(resultsCountLabel(1, '')).toBe('1 job found');
    expect(resultsCountLabel(12, 'tap')).toBe('12 jobs found for “tap”');
  });

  it('pagination', () => {
    expect(totalPages(0)).toBe(0);
    expect(totalPages(12)).toBe(1);
    expect(totalPages(13)).toBe(2);
    expect(totalPages(25, 10)).toBe(3);
    expect(pageLabel(2, 5)).toBe('Page 2 of 5');
  });
});
