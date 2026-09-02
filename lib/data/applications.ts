/**
 * Job applications — ports of:
 *   - apply / withdraw in ~/bldesy-web/app/portal/jobs/[id]/page.tsx (direct
 *     `applications` insert/delete under RLS, the website's own error copy,
 *     best-effort `POST /api/notifications` for enterprise-posted jobs)
 *   - accept / reject via ~/bldesy-web/app/api/applications/decision/route.ts
 *     (server-side so the single-hire auto-reject, job assignment, billing
 *     capture and notification fan-out can't drift)
 *   - applicant lists in ~/bldesy-web/app/my-jobs/page.tsx and
 *     app/enterprise/jobs/[id]/page.tsx (`public_builder_profiles` for the
 *     applicants, `public_profiles` as the name fallback)
 *   - own applications in ~/bldesy-web/app/portal/applications/page.tsx
 */
import { api } from '@/lib/api';
import { db } from '@/lib/supabase';
import type { Application, Job } from '@/types';
import type { ApplicationStatus, Database } from '@/types/database';

/** Website copy — app/portal/jobs/[id]/page.tsx. */
export const APPLY_PERMISSION_ERROR = 'Only approved tradies can apply for jobs.';
export const APPLY_GENERIC_ERROR = "Couldn't submit your application. Please try again.";
export const WITHDRAW_ERROR = 'Failed to withdraw application. Please try again.';

export type ApplicationDecision = 'accept' | 'reject';

export interface ApplicationDecisionResult {
  ok: true;
  /** Ids of the other pending applications auto-rejected by a customer single-hire accept. */
  autoRejected: string[];
}

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/**
 * RLS rejects inserts from users who aren't approved tradies — PostgREST
 * 42501, or a policy/permission message. The website shows a friendly line
 * rather than the raw Postgres error.
 */
export function isApplyPermissionError(error: { code?: string | null; message?: string | null }): boolean {
  return error.code === '42501' || /policy|permission/i.test(error.message ?? '');
}

export type ApplyNotifyJob = Pick<Job, 'id' | 'customer_id' | 'poster_type' | 'title' | 'suburb'>;

/** The website's best-effort in-app note to an enterprise job owner (routed through the dispatcher server-side). */
export function buildNewApplicationNotification(job: ApplyNotifyJob): {
  user_id: string;
  type: 'new_application';
  title: string;
  body: string;
  metadata: { job_id: string };
} {
  return {
    user_id: job.customer_id,
    type: 'new_application',
    title: `New application for "${job.title}"`,
    body: `A tradie has applied to your job in ${job.suburb}`,
    metadata: { job_id: job.id },
  };
}

/** Verbatim union of the my-jobs + enterprise job page applicant selects (+ `slug` for the profile link). */
export const APPLICANT_PROFILE_SELECT =
  'user_id, slug, business_name, trade_category, suburb, phone, profile_photo_url';

type PublicBuilderRow = Database['public']['Views']['public_builder_profiles']['Row'];
export type ApplicantProfile = Pick<
  PublicBuilderRow,
  'user_id' | 'slug' | 'business_name' | 'trade_category' | 'suburb' | 'phone' | 'profile_photo_url'
>;
export type ApplicantPublicProfile = Database['public']['Views']['public_profiles']['Row'];

export type ApplicationWithApplicant = Application & {
  /** Searchable public profile; null when the tradie is unlisted/suspended. */
  applicant: ApplicantProfile | null;
  /** Name/avatar fallback from `public_profiles`; null when unavailable. */
  applicant_public: ApplicantPublicProfile | null;
};

export function attachApplicants(
  applications: Application[],
  profiles: ApplicantProfile[],
  publics: ApplicantPublicProfile[],
): ApplicationWithApplicant[] {
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  const publicMap = new Map(publics.map((p) => [p.id, p]));
  return applications.map((a) => ({
    ...a,
    applicant: profileMap.get(a.builder_id) ?? null,
    applicant_public: publicMap.get(a.builder_id) ?? null,
  }));
}

/** Verbatim job select of the website's My Applications page. */
export const MY_APPLICATION_JOB_SELECT =
  'id, title, trade_category, urgency, suburb, postcode, poster_type, posting_kind, workers_needed, day_rate, contract_duration, customer_id';

export type MyApplicationJob = Pick<
  Job,
  | 'id'
  | 'title'
  | 'trade_category'
  | 'urgency'
  | 'suburb'
  | 'postcode'
  | 'poster_type'
  | 'posting_kind'
  | 'workers_needed'
  | 'day_rate'
  | 'contract_duration'
  | 'customer_id'
>;

export type MyApplication = Application & { job: MyApplicationJob | null };

export function attachJobs(applications: Application[], jobs: MyApplicationJob[]): MyApplication[] {
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  return applications.map((a) => ({ ...a, job: jobMap.get(a.job_id) ?? null }));
}

/* ───────────────────────────── Writes ───────────────────────────── */

/**
 * Apply to a job (direct insert under RLS, as the website does). Rejects with
 * "Only approved tradies can apply for jobs." when RLS blocks the insert, or
 * the generic apply error. Pass `job` to fire the website's best-effort
 * new-application note to an enterprise poster (homeowner jobs are notified
 * by the server).
 */
export async function applyToJob(
  jobId: string,
  builderUserId: string,
  message: string,
  job?: ApplyNotifyJob,
): Promise<{ id: string; status: ApplicationStatus }> {
  const { data, error } = await db
    .from('applications')
    .insert({ job_id: jobId, builder_id: builderUserId, message: message || null, status: 'pending' })
    .select('id, status')
    .single();

  if (error) {
    throw new Error(isApplyPermissionError(error) ? APPLY_PERMISSION_ERROR : APPLY_GENERIC_ERROR);
  }

  if (job && job.poster_type === 'enterprise') {
    api.post('/api/notifications', buildNewApplicationNotification(job)).catch((e) => {
      console.warn('new_application notify failed', e instanceof Error ? e.message : e);
    });
  }

  return data;
}

/** Withdraw (delete) an application — own row under RLS. */
export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await db.from('applications').delete().eq('id', applicationId);
  if (error) throw new Error(WITHDRAW_ERROR);
}

/**
 * The job owner's accept/reject. Idempotent server-side; a customer accept
 * auto-rejects the other pending applications and moves the job to
 * in_progress. 400 invalid, 401, 403 not the owner, 404.
 */
export async function decideApplication(
  applicationId: string,
  action: ApplicationDecision,
): Promise<ApplicationDecisionResult> {
  return api.post<ApplicationDecisionResult>('/api/applications/decision', { applicationId, action });
}

/* ───────────────────────────── Reads ───────────────────────────── */

/** Applications on a job the caller owns, newest first, with applicant profiles attached. */
export async function listApplicationsForJob(jobId: string): Promise<ApplicationWithApplicant[]> {
  const { data, error } = await db
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const applications = (data ?? []) as Application[];
  if (applications.length === 0) return [];

  const builderIds = [...new Set(applications.map((a) => a.builder_id))];
  const [profilesRes, publicsRes] = await Promise.all([
    db.from('public_builder_profiles').select(APPLICANT_PROFILE_SELECT).in('user_id', builderIds),
    db.from('public_profiles').select('id, name, avatar_url').in('id', builderIds),
  ]);
  if (profilesRes.error) console.warn('listApplicationsForJob profiles error', profilesRes.error.message);
  if (publicsRes.error) console.warn('listApplicationsForJob public_profiles error', publicsRes.error.message);

  return attachApplicants(
    applications,
    (profilesRes.data ?? []) as unknown as ApplicantProfile[],
    (publicsRes.data ?? []) as ApplicantPublicProfile[],
  );
}

/** The tradie's own applications (newest first) with the job summary each belongs to. */
export async function listMyApplications(builderUserId: string): Promise<MyApplication[]> {
  const { data, error } = await db
    .from('applications')
    .select('*')
    .eq('builder_id', builderUserId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const applications = (data ?? []) as Application[];
  const jobIds = [...new Set(applications.map((a) => a.job_id))];
  let jobs: MyApplicationJob[] = [];
  if (jobIds.length > 0) {
    const { data: jobRows, error: jobsError } = await db
      .from('jobs')
      .select(MY_APPLICATION_JOB_SELECT)
      .in('id', jobIds);
    if (jobsError) console.warn('listMyApplications jobs error', jobsError.message);
    jobs = (jobRows ?? []) as unknown as MyApplicationJob[];
  }
  return attachJobs(applications, jobs);
}
