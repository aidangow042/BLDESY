import { describe, expect, it, vi } from 'vitest';

import { jobsSubtitle, partitionJobs, tallyByJob } from '@/components/customer-dashboard/applicant-counts';

vi.mock('@/lib/supabase', () => import('../data/mocks/supabase-mock'));

describe('dashboard jobs helpers (app/dashboard/jobs/page.tsx)', () => {
  it('tallies applications per job', () => {
    const counts = tallyByJob([{ job_id: 'a' }, { job_id: 'b' }, { job_id: 'a' }]);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('b')).toBe(1);
    expect(counts.get('c')).toBeUndefined();
    expect(tallyByJob([]).size).toBe(0);
  });

  it('splits active (open / in_progress) from past, keeping order', () => {
    const jobs = [
      { id: '1', status: 'open' as const },
      { id: '2', status: 'completed' as const },
      { id: '3', status: 'in_progress' as const },
      { id: '4', status: 'closed' as const },
    ];
    const { active, past } = partitionJobs(jobs);
    expect(active.map((j) => j.id)).toEqual(['1', '3']);
    expect(past.map((j) => j.id)).toEqual(['2', '4']);
  });

  it('subtitle', () => {
    expect(jobsSubtitle(2, 1)).toBe('2 active · 1 past');
    expect(jobsSubtitle(0, 0)).toBe('0 active · 0 past');
  });
});
