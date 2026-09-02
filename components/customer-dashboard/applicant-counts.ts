/**
 * Applicant counts for the dashboard job list — the `applications.select("job_id")`
 * tally in ~/bldesy-web/app/dashboard/jobs/page.tsx (numbers only, no names).
 * Own-row read under RLS (a job owner can read its applications), as the web does.
 *
 * Candidate for lib/data/applications.ts once that module is free to change.
 */
import { db } from '@/lib/supabase';
import type { Job } from '@/types';
import type { JobStatus } from '@/types/database';

export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = ['open', 'in_progress'];

/** job_id → number of applications. */
export function tallyByJob(rows: readonly { job_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.job_id, (counts.get(row.job_id) ?? 0) + 1);
  return counts;
}

/** Active (open / in_progress) vs past (completed / closed), preserving order. */
export function partitionJobs<T extends Pick<Job, 'status'>>(jobs: readonly T[]): { active: T[]; past: T[] } {
  const active: T[] = [];
  const past: T[] = [];
  for (const job of jobs) (ACTIVE_JOB_STATUSES.includes(job.status) ? active : past).push(job);
  return { active, past };
}

/** "{n} active · {m} past" */
export function jobsSubtitle(activeCount: number, pastCount: number): string {
  return `${activeCount} active · ${pastCount} past`;
}

export async function countApplicationsByJob(jobIds: readonly string[]): Promise<Map<string, number>> {
  if (jobIds.length === 0) return new Map();
  const { data, error } = await db.from('applications').select('job_id').in('job_id', [...jobIds]);
  if (error) {
    console.warn('countApplicationsByJob error', error.message);
    return new Map();
  }
  return tallyByJob(data ?? []);
}
