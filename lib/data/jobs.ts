/**
 * Jobs — ports of ~/bldesy-web/lib/queries/jobs.ts (`getOpenJobs`,
 * `searchJobs`, `getJobsByCustomer`), the job reads in
 * app/portal/jobs/[id]/page.tsx, app/my-jobs/page.tsx and
 * app/enterprise/jobs/[id]/page.tsx, and the job-creation call typed against
 * `POST /api/jobs` (~/bldesy-web/app/api/jobs/route.ts, which shares
 * lib/jobs/create-job-input.ts + lib/jobs/create-job.ts with the web wizard's
 * `postJob` action).
 *
 * Reads/deletes on `jobs` are direct under RLS exactly as the website does;
 * creation goes through the API (validation, rate limit, waitlist gate,
 * enterprise billing gate, tradie fan-out live there). The website is still
 * in waitlist mode until launch: `POST /api/jobs` answers 403
 * `{ code: "waitlist_mode" }` today.
 */
import { api, ApiError } from '@/lib/api';
import { db } from '@/lib/supabase';
import type { Job, JobFilters } from '@/types';
import type { WorkDay } from '@/lib/web/capabilities';
import type {
  ContractType,
  Database,
  EmploymentType,
  JobStatus,
  PayType,
  PosterType,
  PostingKind,
  RequiredCapabilities,
  Urgency,
} from '@/types/database';

export const JOBS_PAGE_SIZE = 12;

/** Website copy — app/my-jobs/page.tsx. */
export const DELETE_JOB_ERROR = 'Failed to delete job. Please try again.';

export type JobPosterTypeFilter = 'all' | 'commercial' | 'residential' | 'contract';

export interface SearchJobsFilters {
  keywords?: string;
  trade?: string;
  location?: string;
  urgency?: string;
  posterType?: JobPosterTypeFilter;
  page?: number;
}

export interface SearchJobsResult {
  jobs: Job[];
  total: number;
  error?: string;
}

export type PosterPublicProfile = Database['public']['Views']['public_profiles']['Row'];

type EnterpriseRow = Database['public']['Views']['public_enterprise_profiles']['Row'];
/** The company banner fields the portal job page reads for enterprise-posted jobs. */
export type PosterCompanyProfile = Pick<
  EnterpriseRow,
  'user_id' | 'company_name' | 'logo_url' | 'cover_photo_url' | 'website' | 'industry_focus'
>;

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/** Escape ilike wildcards for a `%…%` contains match (getOpenJobs suburb filter). */
export function escapeIlikePattern(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Strip PostgREST `.or()` structural delimiters (, . ( ) % * !) so a value
 * like "x,status.eq.draft" can't inject extra predicates, then escape `_`.
 */
export function sanitiseOrToken(s: string): string {
  return s.replace(/[,().%*!]/g, '').replace(/_/g, '\\_');
}

/** The /jobs poster-type toggle → column filters. */
export function posterTypeFilter(
  posterType: JobPosterTypeFilter,
): { poster_type?: PosterType; posting_kind?: PostingKind } {
  if (posterType === 'commercial') return { poster_type: 'enterprise', posting_kind: 'job' };
  if (posterType === 'residential') return { poster_type: 'customer' };
  if (posterType === 'contract') return { poster_type: 'enterprise', posting_kind: 'contract' };
  return {};
}

/** 1-based page → inclusive PostgREST range. */
export function jobSearchRange(page: number, pageSize = JOBS_PAGE_SIZE): { from: number; to: number } {
  const from = (Math.max(1, page) - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/* ───────────────────────────── Reads ───────────────────────────── */

/**
 * Open jobs for the tradie job feed (status open, never seeded/demo rows,
 * newest first, max 100) with optional trade / suburb / urgency filters.
 */
export async function getOpenJobs(filters: JobFilters = {}): Promise<Job[]> {
  let query = db
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    // Seeded/demo rows stay in the DB for demo assets but never hit feeds.
    .eq('is_test', false)
    .order('created_at', { ascending: false });

  if (filters.trade_category) {
    query = query.eq('trade_category', filters.trade_category);
  }
  if (filters.suburb) {
    query = query.ilike('suburb', `%${escapeIlikePattern(filters.suburb)}%`);
  }
  if (filters.urgency) {
    query = query.eq('urgency', filters.urgency as Urgency);
  }

  query = query.limit(100);

  const { data, error } = await query;
  if (error) {
    console.warn('getOpenJobs error', error.message);
    return [];
  }
  return (data ?? []) as Job[];
}

/** Search open jobs with keywords, filters, and pagination (the public /jobs page). */
export async function searchJobs(filters: SearchJobsFilters = {}): Promise<SearchJobsResult> {
  const { keywords, trade, location, urgency, posterType = 'all', page = 1 } = filters;

  let query = db
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('status', 'open')
    .eq('is_test', false)
    .order('created_at', { ascending: false });

  const poster = posterTypeFilter(posterType);
  if (poster.poster_type) query = query.eq('poster_type', poster.poster_type);
  if (poster.posting_kind) query = query.eq('posting_kind', poster.posting_kind);

  if (trade) {
    const trades = trade.split(',').map((t) => t.trim()).filter(Boolean);
    if (trades.length === 1) {
      query = query.eq('trade_category', trades[0]);
    } else if (trades.length > 1) {
      query = query.in('trade_category', trades);
    }
  }

  if (location) {
    const safe = sanitiseOrToken(location);
    query = query.or(`suburb.ilike.%${safe}%,postcode.eq.${safe}`);
  }

  if (urgency && urgency !== 'any') {
    query = query.eq('urgency', urgency as Urgency);
  }

  if (keywords) {
    const safe = sanitiseOrToken(keywords);
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  const { from, to } = jobSearchRange(page);
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.warn('searchJobs error', error.message);
    return { jobs: [], total: 0, error: error.message };
  }
  return { jobs: (data ?? []) as Job[], total: count ?? 0 };
}

/** All jobs posted by a customer/enterprise account, newest first. */
export async function getJobsByCustomer(userId: string): Promise<Job[]> {
  const { data, error } = await db
    .from('jobs')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('getJobsByCustomer error', error.message);
    return [];
  }
  return (data ?? []) as Job[];
}

/**
 * One job with every column the website's job pages read (posting_kind,
 * employment terms, work_days, pay, required_capabilities,
 * min_public_liability, photo/document urls, specialisations, contract
 * roles, …). Null when not found / not visible under RLS.
 */
export async function getJobById(id: string): Promise<Job | null> {
  const { data, error } = await db.from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Job | null) ?? null;
}

/** Homeowner poster identity (name/avatar) via the PII-safe `public_profiles` view. */
export async function getPosterPublicProfile(customerId: string): Promise<PosterPublicProfile | null> {
  const { data, error } = await db
    .from('public_profiles')
    .select('id, name, avatar_url')
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/** Enterprise poster banner fields via the PII-safe `public_enterprise_profiles` view. */
export async function getPosterCompanyProfile(customerId: string): Promise<PosterCompanyProfile | null> {
  const { data, error } = await db
    .from('public_enterprise_profiles')
    .select('user_id, company_name, logo_url, cover_photo_url, website, industry_focus')
    .eq('user_id', customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PosterCompanyProfile | null) ?? null;
}

/* ───────────────────────────── Own-row writes ───────────────────────────── */

/** Delete a job the caller posted (own row under RLS). */
export async function deleteJob(id: string): Promise<void> {
  const { error } = await db.from('jobs').delete().eq('id', id);
  if (error) throw new Error(DELETE_JOB_ERROR);
}

/** Close / complete a job the caller posted (the enterprise job page's status buttons). */
export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  const { error } = await db.from('jobs').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Record a tradie viewing a job (best-effort, deduplicated per viewer per
 * day server-side — the duplicate error is expected and ignored).
 */
export async function recordJobView(jobId: string, viewerId: string): Promise<void> {
  const { error } = await db.from('job_views').insert({ job_id: jobId, viewer_id: viewerId });
  if (error && !error.message.includes('duplicate')) {
    console.warn('job_views insert failed', error.message);
  }
}

/* ───────────────────────────── Create (POST /api/jobs) ───────────────────────────── */

export interface CreateJobContractRole {
  /** Trade slug — same vocabulary as jobs.trade_category. */
  trade: string;
  workers: number;
  rate?: string;
  notes?: string;
  startDate?: string;
  duration?: string;
}

/**
 * The job wizard's fields (hidden inputs in ~/bldesy-web/components/jobs/
 * job-wizard.tsx, validated by lib/schemas.ts postJobSchema + lib/jobs/
 * create-job-input.ts). Required: title 1–200, description 1–5000,
 * trade_category, urgency, suburb 1–100, postcode /^\d{4}$/. String fields
 * must be strings (a number is rejected). Every enterprise-only field is
 * nulled server-side when poster_type is "customer"; `email` is accepted and
 * ignored (jobs has no contact column).
 */
export interface CreateJobInput {
  title: string;
  description: string;
  trade_category: string;
  urgency: Urgency;
  suburb: string;
  postcode: string;
  /** Sub-trade slugs valid for trade_category (invalid ones are dropped). */
  specialisations?: string[];
  /** Accepted for wizard parity, never persisted. */
  email?: string;
  /** ≤ 50 chars. */
  budget?: string;
  /** Valid http(s) URLs; invalid entries dropped, empty list stores null. */
  photo_urls?: string[];
  document_urls?: string[];
  /** Default "customer". */
  poster_type?: PosterType;
  /** Default "job". Contracts are enterprise-only. */
  posting_kind?: PostingKind;
  contract_type?: ContractType;
  /** ≤ 30 roles; a contract needs at least one. */
  contract_roles?: CreateJobContractRole[];
  /** int 1–500. */
  workers_needed?: number;
  /** ≤ 200 chars. */
  contract_duration?: string;
  /** ≤ 50 chars. */
  day_rate?: string;
  /** ≤ 30 chars (YYYY-MM-DD). */
  start_date?: string;
  /** ≤ 2000 chars. */
  site_requirements?: string;
  employment_type?: EmploymentType;
  end_date?: string;
  is_ongoing?: boolean;
  /** ≤ 10 chars. */
  daily_start_time?: string;
  daily_finish_time?: string;
  /** Deduped server-side; days_per_week derives from its length. */
  work_days?: WorkDay[];
  pay_type?: PayType;
  /** int 0–10,000,000. */
  pay_rate_min?: number;
  pay_rate_max?: number;
  required_capabilities?: RequiredCapabilities;
  /** int 0–1,000,000,000. */
  min_public_liability?: number;
}

/** Where the web wizard's success card sends the poster — the app gets the same path. */
export type CreateJobRedirect = '/my-jobs' | '/enterprise/jobs' | '/enterprise/jobs?kind=contract';

export type CreateJobErrorCode =
  | 'rate_limited'
  | 'waitlist_mode'
  | 'enterprise_not_approved'
  | 'payment_required'
  | 'post_limit_reached'
  | 'billing_update_failed'
  | 'insert_failed';

export interface CreateJobSuccess {
  ok: true;
  jobId: string;
  redirect: CreateJobRedirect;
}

export interface CreateJobFailure {
  ok: false;
  /** 400 validation, 401, 402 billing, 403 waitlist / not approved, 429, 500. */
  status: number;
  /** The website's own message — render it verbatim. */
  error: string;
  /** Absent (null) on 400/401 validation and auth failures. */
  code: CreateJobErrorCode | null;
  /** The raw error, so `isWaitlistClosed(res.cause)` keeps working. */
  cause: ApiError;
}

export type CreateJobResult = CreateJobSuccess | CreateJobFailure;

const CREATE_JOB_ERROR_CODES: ReadonlySet<string> = new Set<CreateJobErrorCode>([
  'rate_limited',
  'waitlist_mode',
  'enterprise_not_approved',
  'payment_required',
  'post_limit_reached',
  'billing_update_failed',
  'insert_failed',
]);

function isCreateJobErrorCode(code: unknown): code is CreateJobErrorCode {
  return typeof code === 'string' && CREATE_JOB_ERROR_CODES.has(code);
}

/** Map a failed POST to the API's `{ ok: false, error, code }` shape. */
export function createJobFailure(e: ApiError): CreateJobFailure {
  return {
    ok: false,
    status: e.status,
    error: e.message,
    code: isCreateJobErrorCode(e.code) ? e.code : null,
    cause: e,
  };
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function optionalString(v: string | number | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = typeof v === 'number' ? String(v) : v.trim();
  return s ? s : undefined;
}

function optionalList<T>(v: T[] | null | undefined): T[] | undefined {
  return v && v.length > 0 ? v : undefined;
}

/**
 * The JSON body for `POST /api/jobs`: required strings trimmed, optional
 * blanks dropped (undefined and "" validate identically server-side, so the
 * body stays small), arrays/objects sent natively, string fields guaranteed
 * to be strings.
 */
export function buildCreateJobBody(input: CreateJobInput): Record<string, Json | undefined> {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    trade_category: input.trade_category.trim(),
    urgency: input.urgency,
    suburb: input.suburb.trim(),
    postcode: input.postcode.trim(),
    specialisations: optionalList(input.specialisations),
    email: optionalString(input.email),
    budget: optionalString(input.budget),
    photo_urls: optionalList(input.photo_urls),
    document_urls: optionalList(input.document_urls),
    poster_type: input.poster_type,
    posting_kind: input.posting_kind,
    contract_type: input.contract_type,
    contract_roles: optionalList(input.contract_roles) as Json[] | undefined,
    workers_needed: input.workers_needed,
    contract_duration: optionalString(input.contract_duration),
    day_rate: optionalString(input.day_rate),
    start_date: optionalString(input.start_date),
    site_requirements: optionalString(input.site_requirements),
    employment_type: input.employment_type,
    end_date: optionalString(input.end_date),
    is_ongoing: input.is_ongoing,
    daily_start_time: optionalString(input.daily_start_time),
    daily_finish_time: optionalString(input.daily_finish_time),
    work_days: optionalList(input.work_days),
    pay_type: input.pay_type,
    pay_rate_min: input.pay_rate_min,
    pay_rate_max: input.pay_rate_max,
    required_capabilities: input.required_capabilities as { [key: string]: Json } | undefined,
    min_public_liability: input.min_public_liability,
  };
}

/**
 * Post a job through the website (`POST /api/jobs`, 201 on success). HTTP
 * failures resolve to `{ ok: false, status, error, code }` with the
 * website's own copy — 400 schema errors ("Contracts can only be posted from
 * an enterprise account.", "Add at least one role (trade) to your
 * contract.", …), 401 "Unauthorized" (also anonymous sessions), 402
 * payment_required | post_limit_reached, 403 waitlist_mode |
 * enterprise_not_approved, 429 rate_limited ("You're posting too many jobs.
 * Please wait before posting again." — 10/hour shared with the web), 500
 * insert_failed | billing_update_failed. Network failures reject.
 */
export async function createJob(input: CreateJobInput): Promise<CreateJobResult> {
  try {
    const res = await api.post<{ ok: true; jobId: string; redirect: CreateJobRedirect }>(
      '/api/jobs',
      buildCreateJobBody(input),
    );
    return { ok: true, jobId: res.jobId, redirect: res.redirect };
  } catch (e) {
    if (e instanceof ApiError) return createJobFailure(e);
    throw e;
  }
}
