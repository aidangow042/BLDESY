/**
 * lib/data/enterprise.ts — the business (enterprise) hub data layer.
 *
 * Port of:
 *   ~/bldesy-web/app/enterprise/enterprise-context.tsx + layout.tsx (own enterprise_profiles row)
 *   ~/bldesy-web/app/enterprise/page.tsx           (dashboard metrics: active, applicants, hired,
 *                                                   fill rate, apps today, avg time to fill, top jobs)
 *   ~/bldesy-web/app/enterprise/jobs/page.tsx      (own job posts + applicant counts, delete)
 *   ~/bldesy-web/app/enterprise/jobs/[id]/page.tsx (job + applicants joined to public_builder_profiles,
 *                                                   tradie_capabilities, reviews; computeMatch;
 *                                                   filter/sort; close / mark complete)
 *   ~/bldesy-web/app/enterprise/billing/page.tsx   (enterprise_subscriptions + payments; Stripe state)
 *
 * Cross-user reads use the PII-safe `public_builder_profiles` view only.
 * Applicants' capabilities come from `tradie_capabilities` with the explicit
 * column list (the website's browser client reads the same table under RLS).
 *
 * NOT here (owned by lib/data/applications.ts): accept / reject —
 * POST /api/applications/decision { applicationId, action }.
 */
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { onProfileChanged } from '@/lib/events/profile';
import { db } from '@/lib/supabase';
import type { TradieCapabilities } from '@/lib/web/capabilities';
import { computeMatch, matchHeadline, matchTier, type MatchResult, type MatchTier } from '@/lib/web/match';
import type { ApplicationStatus, Database, JobStatus, PostingKind } from '@/types/database';

import {
  enterpriseTierFromPlan,
  getEnterpriseSubscriptionState,
  type EnterpriseSubscriptionState,
} from './billing';
import { readCapabilitiesRows } from './capabilities';
import { requireUserId } from './own-session';

type Tables = Database['public']['Tables'];
export type EnterpriseProfile = Tables['enterprise_profiles']['Row'];
export type EnterpriseJob = Tables['jobs']['Row'];
export type EnterpriseSubscriptionRow = Tables['enterprise_subscriptions']['Row'];
export type EnterprisePaymentRow = Tables['enterprise_payments']['Row'];

export { enterpriseTierFromPlan, getEnterpriseSubscriptionState };
export type { EnterpriseSubscriptionState };

/* ── Own profile ────────────────────────────────────────────────────── */

/** The signed-in user's enterprise_profiles row (RLS: owner), or null. */
export async function getOwnEnterpriseProfile(userId?: string): Promise<EnterpriseProfile | null> {
  const uid = userId ?? (await requireUserId());
  const { data, error } = await db.from('enterprise_profiles').select('*').eq('user_id', uid).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Columns the business may edit on its own row (system/approval columns excluded). */
export type EnterpriseProfileUpdate = Omit<
  Tables['enterprise_profiles']['Update'],
  | 'id'
  | 'user_id'
  | 'approved'
  | 'status'
  | 'rejection_reason'
  | 'verified'
  | 'has_active_subscription'
  | 'subscription_plan'
  | 'stripe_customer_id'
  | 'credentials_verified'
  | 'created_at'
  | 'updated_at'
>;

/** Patch the own enterprise_profiles row. */
export async function updateOwnEnterpriseProfile(patch: EnterpriseProfileUpdate): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db.from('enterprise_profiles').update(patch).eq('user_id', uid);
  if (error) throw new Error(error.message);
}

export interface OwnEnterpriseProfileState {
  profile: EnterpriseProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** The app twin of useEnterprise(): the own row, refreshed on demand / profile-changed. */
export function useOwnEnterpriseProfile(): OwnEnterpriseProfileState {
  const { authedUser, loading: authLoading } = useUser();
  const uid = authedUser?.id ?? null;
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      setProfile(await getOwnEnterpriseProfile(uid));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void refresh();
    return onProfileChanged(() => {
      void refresh();
    });
  }, [authLoading, refresh]);

  return { profile, loading: authLoading || loading, error, refresh };
}

/* ── Jobs ───────────────────────────────────────────────────────────── */

export interface ApplicationCountRow {
  job_id: string;
  status: ApplicationStatus | string;
  created_at?: string;
}

export interface JobApplicantCounts {
  applicant_count: number;
  accepted_count: number;
}

/** Per-job applicant totals from an applications list. */
export function countApplicantsByJob(apps: readonly ApplicationCountRow[]): Record<string, JobApplicantCounts> {
  const counts: Record<string, JobApplicantCounts> = {};
  for (const a of apps) {
    if (!counts[a.job_id]) counts[a.job_id] = { applicant_count: 0, accepted_count: 0 };
    counts[a.job_id].applicant_count++;
    if (a.status === 'accepted') counts[a.job_id].accepted_count++;
  }
  return counts;
}

export type EnterpriseJobWithCounts = EnterpriseJob & JobApplicantCounts;

/**
 * The business's own posts (newest first) with applicant counts — optionally
 * one posting kind (the Jobs / Contracts toggle). Also returns the raw
 * application rows for the dashboard's "apps today".
 */
export async function listEnterpriseJobs(
  kind?: PostingKind,
): Promise<{ jobs: EnterpriseJobWithCounts[]; applications: ApplicationCountRow[] }> {
  const uid = await requireUserId();
  let query = db
    .from('jobs')
    .select('*')
    .eq('customer_id', uid)
    .eq('poster_type', 'enterprise')
    .order('created_at', { ascending: false });
  if (kind) query = query.eq('posting_kind', kind);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const jobList = (data ?? []) as EnterpriseJob[];
  if (jobList.length === 0) return { jobs: [], applications: [] };

  const { data: apps, error: appsError } = await db
    .from('applications')
    .select('job_id, status, created_at')
    .in(
      'job_id',
      jobList.map((j) => j.id),
    );
  if (appsError) throw new Error(appsError.message);
  const applications = (apps ?? []) as ApplicationCountRow[];
  const counts = countApplicantsByJob(applications);
  return {
    jobs: jobList.map((j) => ({
      ...j,
      applicant_count: counts[j.id]?.applicant_count ?? 0,
      accepted_count: counts[j.id]?.accepted_count ?? 0,
    })),
    applications,
  };
}

/** One of the business's own jobs (RLS + explicit owner filter, as the website does). */
export async function getEnterpriseJob(jobId: string): Promise<EnterpriseJob | null> {
  const uid = await requireUserId();
  const { data, error } = await db
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('customer_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Close (open → closed) or complete (in_progress → completed) an own job. */
export async function updateEnterpriseJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db.from('jobs').update({ status }).eq('id', jobId).eq('customer_id', uid);
  if (error) throw new Error(error.message);
}

/** The website's delete-job failure copy. */
export const ERR_DELETE_JOB = 'Failed to delete job. Please try again.';

/** Delete an own job (applicants + messages cascade). */
export async function deleteEnterpriseJob(jobId: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db.from('jobs').delete().eq('id', jobId).eq('customer_id', uid);
  if (error) throw new Error(ERR_DELETE_JOB);
}

/* ── Dashboard metrics (app/enterprise/page.tsx) ────────────────────── */

export interface EnterpriseJobMetricRow {
  id: string;
  status: JobStatus | string;
  workers_needed: number;
  created_at: string;
  applicant_count: number;
  accepted_count: number;
}

export interface EnterpriseMetrics {
  activeJobs: number;
  openJobs: number;
  inProgressJobs: number;
  totalPosted: number;
  totalApplicants: number;
  totalAccepted: number;
  totalWorkersNeeded: number;
  /** accepted ÷ workers needed, rounded. */
  fillRate: number;
  appsToday: number;
  /** Whole days since posting, averaged over filled jobs; null when none filled. */
  avgTimeToFillDays: number | null;
  filledJobs: number;
  avgAppsPerJob: number;
  /** Top 3 by applicant count. */
  topJobIds: string[];
}

const MS_PER_DAY = 86_400_000;

export function computeEnterpriseMetrics(
  jobs: readonly EnterpriseJobMetricRow[],
  applications: readonly ApplicationCountRow[],
  now: Date = new Date(),
): EnterpriseMetrics {
  const active = jobs.filter((j) => j.status === 'open' || j.status === 'in_progress');
  const totalApplicants = jobs.reduce((s, j) => s + j.applicant_count, 0);
  const totalAccepted = jobs.reduce((s, j) => s + j.accepted_count, 0);
  const totalWorkersNeeded = jobs.reduce((s, j) => s + j.workers_needed, 0);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const appsToday = applications.filter(
    (a) => a.created_at != null && new Date(a.created_at) >= startOfToday,
  ).length;

  const filled = jobs.filter((j) => j.accepted_count >= j.workers_needed && j.workers_needed > 0);
  const avgTimeToFillDays =
    filled.length === 0
      ? null
      : Math.round(
          filled.reduce(
            (s, j) => s + Math.floor((now.getTime() - new Date(j.created_at).getTime()) / MS_PER_DAY),
            0,
          ) / filled.length,
        );

  return {
    activeJobs: active.length,
    openJobs: jobs.filter((j) => j.status === 'open').length,
    inProgressJobs: jobs.filter((j) => j.status === 'in_progress').length,
    totalPosted: jobs.length,
    totalApplicants,
    totalAccepted,
    totalWorkersNeeded,
    fillRate: totalWorkersNeeded > 0 ? Math.round((totalAccepted / totalWorkersNeeded) * 100) : 0,
    appsToday,
    avgTimeToFillDays,
    filledJobs: filled.length,
    avgAppsPerJob: jobs.length > 0 ? Math.round(totalApplicants / jobs.length) : 0,
    topJobIds: [...jobs]
      .sort((a, b) => b.applicant_count - a.applicant_count)
      .slice(0, 3)
      .map((j) => j.id),
  };
}

/* ── Applicants (app/enterprise/jobs/[id]/page.tsx) ─────────────────── */

export interface Applicant {
  id: string;
  builder_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  builder_name: string | null;
  builder_trade: string | null;
  builder_suburb: string | null;
  /** Only present when the tradie shows contact details (view-gated). */
  builder_phone: string | null;
  builder_photo: string | null;
  /** null = the applicant tradie hasn't filled out the capabilities step. */
  capabilities: TradieCapabilities | null;
  match: MatchResult;
  matchTier: MatchTier;
  matchHeadline: string;
  averageRating: number;
  reviewCount: number;
}

export type ApplicantSortMode = 'best_match' | 'most_recent' | 'highest_rated';

export interface RatingAggregate {
  sum: number;
  count: number;
}

/** reviewee_id → { sum, count }. */
export function aggregateApplicantRatings(
  reviews: readonly { reviewee_id: string; rating: number }[],
): Record<string, RatingAggregate> {
  const agg: Record<string, RatingAggregate> = {};
  for (const r of reviews) {
    const cur = agg[r.reviewee_id] ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    agg[r.reviewee_id] = cur;
  }
  return agg;
}

/** The page's filter + sort, pure. "most_recent" keeps the descending created_at fetch order. */
export function sortApplicants<T extends Pick<Applicant, 'match' | 'averageRating' | 'created_at'>>(
  applicants: readonly T[],
  sortMode: ApplicantSortMode,
  onlyFullMatches: boolean = false,
): T[] {
  const filtered = onlyFullMatches ? applicants.filter((a) => matchTier(a.match) === 'full') : [...applicants];
  const sorted = [...filtered];
  if (sortMode === 'best_match') {
    sorted.sort((a, b) => {
      const ar = a.match.metRequired.length / Math.max(a.match.totalRequired, 1);
      const br = b.match.metRequired.length / Math.max(b.match.totalRequired, 1);
      if (br !== ar) return br - ar;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } else if (sortMode === 'highest_rated') {
    sorted.sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }
  return sorted;
}

/** Does the job ask for anything a match badge can show? */
export function jobHasRequirements(
  job: Pick<EnterpriseJob, 'required_capabilities' | 'min_public_liability'> | null | undefined,
): boolean {
  return !!(
    job &&
    ((job.required_capabilities && Object.keys(job.required_capabilities).length > 0) ||
      job.min_public_liability != null)
  );
}

/**
 * Applicants for an own job: applications (newest first) joined to the
 * PII-safe builder view, capability rows and review aggregates, each scored
 * against the job's requirements with computeMatch.
 */
export async function getEnterpriseJobApplicants(jobId: string): Promise<Applicant[]> {
  const job = await getEnterpriseJob(jobId);
  if (!job) return [];

  const { data: appsData, error } = await db
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const apps = (appsData ?? []) as Tables['applications']['Row'][];
  if (apps.length === 0) return [];

  const builderIds = [...new Set(apps.map((a) => a.builder_id))];
  const [buildersRes, capsMap, reviewsRes] = await Promise.all([
    db
      .from('public_builder_profiles')
      .select('user_id, business_name, trade_category, suburb, phone, profile_photo_url')
      .in('user_id', builderIds),
    readCapabilitiesRows(builderIds),
    db.from('reviews').select('reviewee_id, rating').in('reviewee_id', builderIds),
  ]);
  if (buildersRes.error) throw new Error(buildersRes.error.message);
  if (reviewsRes.error) throw new Error(reviewsRes.error.message);

  type BuilderCard = {
    user_id: string;
    business_name: string | null;
    trade_category: string | null;
    suburb: string | null;
    phone: string | null;
    profile_photo_url: string | null;
  };
  const builderMap = new Map<string, BuilderCard>();
  for (const b of (buildersRes.data ?? []) as unknown as BuilderCard[]) builderMap.set(b.user_id, b);
  const reviewAgg = aggregateApplicantRatings((reviewsRes.data ?? []) as { reviewee_id: string; rating: number }[]);

  return apps.map((a) => {
    const caps = capsMap.get(a.builder_id) ?? null;
    const match = computeMatch(caps, job.required_capabilities, job.min_public_liability);
    const b = builderMap.get(a.builder_id);
    const agg = reviewAgg[a.builder_id];
    return {
      id: a.id,
      builder_id: a.builder_id,
      message: a.message,
      status: a.status,
      created_at: a.created_at,
      builder_name: b?.business_name ?? null,
      builder_trade: b?.trade_category ?? null,
      builder_suburb: b?.suburb ?? null,
      builder_phone: b?.phone ?? null,
      builder_photo: b?.profile_photo_url ?? null,
      capabilities: caps,
      match,
      matchTier: matchTier(match),
      matchHeadline: matchHeadline(match),
      averageRating: agg ? agg.sum / agg.count : 0,
      reviewCount: agg?.count ?? 0,
    };
  });
}

/* ── Billing (app/enterprise/billing/page.tsx) ──────────────────────── */

export interface EnterpriseBilling {
  /** Newest active row (tolerates webhook-race duplicates), or null. */
  subscription: EnterpriseSubscriptionRow | null;
  payments: EnterprisePaymentRow[];
  /** Live Stripe cancel/renew state + card; null when the sub is absent or the call failed. */
  stripeState: EnterpriseSubscriptionState | null;
}

async function readActiveSubscription(profileId: string): Promise<EnterpriseSubscriptionRow | null> {
  const { data, error } = await db
    .from('enterprise_subscriptions')
    .select('*')
    .eq('enterprise_profile_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Subscription + last 20 payments, the way the billing page loads them: a
 * cache miss triggers one POST /api/stripe/enterprise-reconcile then a re-read.
 *
 * NOTE: enterprise-reconcile authenticates with the cookie client
 * (`createClient()`), so the reconcile step 401s from the app until the web
 * switches it to `createApiClient(request)` — failures are swallowed as on the
 * website and the DB view stands.
 */
export async function getEnterpriseBilling(profileId: string): Promise<EnterpriseBilling> {
  const [subRow, payRes] = await Promise.all([
    readActiveSubscription(profileId),
    db
      .from('enterprise_payments')
      .select('*')
      .eq('enterprise_profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (payRes.error) throw new Error(payRes.error.message);

  let subscription = subRow;
  if (!subscription) {
    try {
      await api.post('/api/stripe/enterprise-reconcile');
      subscription = await readActiveSubscription(profileId);
    } catch {
      /* fall through to the "no subscription" state */
    }
  }

  let stripeState: EnterpriseSubscriptionState | null = null;
  if (subscription) {
    try {
      stripeState = await getEnterpriseSubscriptionState();
    } catch {
      /* non-fatal — the page still renders with DB-only data */
    }
  }

  return { subscription, payments: (payRes.data ?? []) as EnterprisePaymentRow[], stripeState };
}

/** Posts used this cycle as a percentage (Builder/starter plan only; 0 otherwise). */
export function postsUsedPercent(sub: Pick<EnterpriseSubscriptionRow, 'plan' | 'posts_limit' | 'posts_used_this_cycle'>): number {
  if (sub.plan !== 'starter' || !sub.posts_limit) return 0;
  return Math.min(100, Math.round((sub.posts_used_this_cycle / sub.posts_limit) * 100));
}
