/**
 * lib/data/tradie-jobs.ts — the tradie portal job feeds.
 *
 * Port of:
 *   ~/bldesy-web/app/portal/jobs/residential/page.tsx  (Home Jobs: poster_type customer)
 *   ~/bldesy-web/app/portal/jobs/commercial/page.tsx   (Project Jobs: enterprise + posting_kind job,
 *                                                       capability match pills, speciality sort,
 *                                                       "hide jobs I don't fully match")
 *   ~/bldesy-web/app/portal/jobs/contracts/page.tsx    (Contracts: enterprise + posting_kind contract,
 *                                                       My / Explore sub-tab + search)
 *   ~/bldesy-web/lib/job-feed-filter.ts                (filterJobsByBuilderRadius — ported with the
 *                                                       app's bundled geocoder in place of /api/suburbs)
 *
 * Gates: Project Jobs / Contracts show the Stage 2 teaser while
 * `zoneIsLive('project_jobs' | 'contracts')` is false — the SCREEN checks that
 * (lib/launch-flags), exactly as the website pages branch on STAGE2_JOBS_LIVE.
 *
 * Deviation: `is_test = false` is applied here (migration 20260808 marks
 * seeded/demo rows; the website pages don't filter it client-side).
 * orderMatchesByZonePriority is NOT used — the website orders TRADIES for the
 * job-alert fan-out with it; its job feeds keep created_at order (Project Jobs
 * float speciality matches first).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { distanceKm, geocode } from '@/lib/geo';
import { db } from '@/lib/supabase';
import type { PayType, TradieCapabilities } from '@/lib/web/capabilities';
import { computeMatch, matchHeadline, matchTier, type MatchResult, type MatchTier } from '@/lib/web/match';
import {
  coverageIncludesPoint,
  parseServiceAreas,
  stateForPostcode,
} from '@/lib/web/service-areas';
import type { Database, PosterType, PostingKind, Urgency } from '@/types/database';

import { requireUserId } from './own-session';

export type Job = Database['public']['Tables']['jobs']['Row'];

export type FeedKind = 'home' | 'project' | 'contract';
export type UrgencyFilter = 'all' | Urgency;
export type ContractsSubTab = 'my' | 'explore';

/* ── Feed definition ────────────────────────────────────────────────── */

export interface FeedKindFilters {
  poster_type: PosterType;
  posting_kind?: PostingKind;
}

/** The website's per-feed query filters. */
export function feedKindFilters(kind: FeedKind): FeedKindFilters {
  switch (kind) {
    case 'home':
      return { poster_type: 'customer' };
    case 'project':
      return { poster_type: 'enterprise', posting_kind: 'job' };
    case 'contract':
      return { poster_type: 'enterprise', posting_kind: 'contract' };
  }
}

/** The slice of the own builder row the feeds read. */
export interface FeedProfile {
  trade_category: string | null;
  trade_categories: string[] | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  service_areas?: string[] | null;
  specialisations?: Record<string, string[]> | null;
}

/**
 * The feeds only surface jobs in the builder's trade(s): trade_categories when
 * set, else the legacy single trade_category, else no trade filter at all.
 */
export function builderTradesFor(
  profile: Pick<FeedProfile, 'trade_category' | 'trade_categories'> | null | undefined,
): string[] {
  if (profile?.trade_categories && profile.trade_categories.length > 0) return profile.trade_categories;
  return profile?.trade_category ? [profile.trade_category] : [];
}

/* ── Location refine (lib/job-feed-filter.ts) ───────────────────────── */

export const DEFAULT_RADIUS_KM = 30;

export interface JobLike {
  suburb: string;
  postcode?: string | null;
}

export interface BuilderGeo {
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  service_areas?: string[] | null;
}

export type GeocodeFn = (
  query: string,
) => Promise<{ latitude: number; longitude: number } | null>;

/**
 * Keep the jobs the builder's declared coverage reaches: state claims (off the
 * job postcode), Primary OR Can-cover zone circles, or the home-base travel
 * radius (radius_km, default 30). Graceful failures:
 *   - no home base AND no region/state coverage → jobs unchanged
 *   - suburb can't be geocoded → the job is INCLUDED (never hide a real post
 *     over a typo)
 * One geocode per unique suburb, parallelised. `geocodeFn` is injectable for tests.
 */
export async function filterJobsByBuilderRadius<T extends JobLike>(
  jobs: T[],
  builder: BuilderGeo | null | undefined,
  geocodeFn: GeocodeFn = geocode,
): Promise<T[]> {
  if (!builder) return jobs;

  const coverage = parseServiceAreas(builder.service_areas);
  // Can cover (`cover:`) counts here exactly like Primary (`region:`): this is
  // the eligibility filter, and the tradie's own feed has to show the jobs they
  // get alerted about. Ranking is what separates the two kinds, not visibility.
  const hasRegionCoverage =
    coverage.regions.length > 0 || coverage.coverRegions.length > 0 || coverage.states.length > 0;
  const hasHomeBase = builder.latitude != null && builder.longitude != null;
  if (!hasHomeBase && !hasRegionCoverage) return jobs;

  const radius = builder.radius_km ?? DEFAULT_RADIUS_KM;

  const uniqueSuburbs = Array.from(new Set(jobs.map((j) => j.suburb).filter(Boolean)));
  const coords = new Map<string, { latitude: number; longitude: number } | null>();
  await Promise.all(
    uniqueSuburbs.map(async (s) => {
      coords.set(s, await geocodeFn(s));
    }),
  );

  return jobs.filter((j) => {
    // State coverage works straight off the job's postcode — no geocode needed.
    const jobState = stateForPostcode(j.postcode);
    if (jobState && coverage.states.includes(jobState)) return true;

    const c = coords.get(j.suburb);
    if (!c) return true;
    if (hasRegionCoverage && coverageIncludesPoint(coverage, c, jobState)) return true;
    if (!hasHomeBase) return false;
    return distanceKm(builder.latitude!, builder.longitude!, c.latitude, c.longitude) <= radius;
  });
}

/* ── Pure list transforms ───────────────────────────────────────────── */

/** The All / ASAP / This Week / Flexible pills. */
export function applyUrgencyFilter<T extends { urgency: Urgency }>(
  jobs: readonly T[],
  filter: UrgencyFilter,
): T[] {
  return filter === 'all' ? [...jobs] : jobs.filter((j) => j.urgency === filter);
}

export type SpecialisationsByTrade = Record<string, string[]>;

/** The viewer's per-trade specialisations, tolerant of a missing/odd column. */
export function viewerSpecialisations(
  profile: Pick<FeedProfile, 'specialisations'> | null | undefined,
): SpecialisationsByTrade {
  const raw = profile?.specialisations;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as SpecialisationsByTrade) : {};
}

/**
 * Does a job's wanted sub-trade overlap THIS builder's specialities? Pure
 * badge/ranking signal — a job is never hidden for not matching.
 */
export function jobMatchesSpeciality(
  job: Pick<Job, 'trade_category' | 'specialisations'>,
  viewerSpecs: SpecialisationsByTrade,
): boolean {
  const jobSpecs = (job.specialisations ?? []) as string[];
  const mine = viewerSpecs[job.trade_category] ?? [];
  return jobSpecs.length > 0 && jobSpecs.some((s) => mine.includes(s));
}

/**
 * Project Jobs order: speciality matches float to the top; created_at order is
 * preserved within each group (stable sort).
 */
export function sortBySpecialityMatch<T extends Pick<Job, 'id' | 'trade_category' | 'specialisations'>>(
  jobs: readonly T[],
  viewerSpecs: SpecialisationsByTrade,
): T[] {
  return [...jobs].sort(
    (a, b) =>
      Number(jobMatchesSpeciality(b, viewerSpecs)) - Number(jobMatchesSpeciality(a, viewerSpecs)),
  );
}

/** Per-job capability match for the Project Jobs feed. */
export function matchResultsFor(
  jobs: readonly Pick<Job, 'id' | 'required_capabilities' | 'min_public_liability'>[],
  viewerCapabilities: TradieCapabilities | null,
): Map<string, MatchResult> {
  const map = new Map<string, MatchResult>();
  for (const j of jobs) {
    map.set(j.id, computeMatch(viewerCapabilities, j.required_capabilities, j.min_public_liability));
  }
  return map;
}

/** "Hide jobs I don't fully match": keep jobs with no requirements or a full match. */
export function filterFullMatches<T extends { id: string }>(
  jobs: readonly T[],
  matchByJob: Map<string, MatchResult>,
  hideUnmatched: boolean,
): T[] {
  if (!hideUnmatched) return [...jobs];
  return jobs.filter((j) => {
    const m = matchByJob.get(j.id);
    return !m || m.hasNoRequirements || matchTier(m) === 'full';
  });
}

export interface ContractsFilterOptions {
  hiddenJobIds: ReadonlySet<string>;
  appliedJobIds: ReadonlySet<string>;
  subTab: ContractsSubTab;
  search: string;
}

/** Contracts page list: hidden removed, "My Contracts" = applied, free-text search. */
export function filterContracts<T extends Pick<Job, 'id' | 'title' | 'description' | 'suburb'>>(
  contracts: readonly T[],
  opts: ContractsFilterOptions,
): T[] {
  let list = contracts.filter((c) => !opts.hiddenJobIds.has(c.id));
  if (opts.subTab === 'my') list = list.filter((c) => opts.appliedJobIds.has(c.id));
  const q = opts.search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.suburb.toLowerCase().includes(q),
    );
  }
  return list;
}

export interface TradieJobMatch {
  match: MatchResult;
  tier: MatchTier;
  /** e.g. "All requirements met" / "8/10 requirements met" / "No specific requirements". */
  headline: string;
  /** Required items missing + an unmet public-liability minimum (the amber "Missing N" pill). */
  missingCount: number;
}

/** The viewing tradie's fit for one job (Project Jobs card + job detail banner). */
export function getTradieMatchForJob(
  job: Pick<Job, 'required_capabilities' | 'min_public_liability'>,
  capabilities: TradieCapabilities | null,
): TradieJobMatch {
  const match = computeMatch(capabilities, job.required_capabilities, job.min_public_liability);
  const missingCount =
    match.missingRequired.length +
    (match.publicLiabilityRequired != null && !match.publicLiabilityMet ? 1 : 0);
  return { match, tier: matchTier(match), headline: matchHeadline(match), missingCount };
}

/** Pay caption for a Project Job card (commercial/page.tsx formatPayCaption). */
export function formatPayCaption(
  payType: PayType | null,
  min: number | null,
  max: number | null,
): string | null {
  if (payType === 'negotiable') return 'Pay negotiable';
  if (min == null && max == null) return payType ? `${capitalisePayType(payType)} rate` : null;
  const unit = payType === 'hourly' ? '/hr' : payType === 'daily' ? '/day' : '';
  if (min != null && max != null && min !== max) {
    return `$${min.toLocaleString('en-AU')}–$${max.toLocaleString('en-AU')}${unit}`;
  }
  const single = (min ?? max) as number;
  return `$${single.toLocaleString('en-AU')}${unit}`;
}

function capitalisePayType(p: PayType): string {
  switch (p) {
    case 'hourly':
      return 'Hourly';
    case 'daily':
      return 'Daily';
    case 'fixed_contract':
      return 'Fixed contract';
    case 'negotiable':
      return 'Negotiable';
  }
}

/* ── Hidden jobs (device-local, like the website's localStorage) ────── */

/** One key per feed — the website's localStorage keys, verbatim. */
export const HIDDEN_JOBS_STORAGE_KEY: Record<FeedKind, string> = {
  home: 'bldesy_hidden_home_jobs',
  project: 'bldesy_hidden_project_jobs',
  contract: 'bldesy_hidden_contracts',
};

/** Parse the stored JSON array; anything malformed reads as "nothing hidden". */
export function parseHiddenJobIds(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v): v is string => typeof v === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function serialiseHiddenJobIds(ids: ReadonlySet<string>): string {
  return JSON.stringify([...ids]);
}

/** Job ids the tradie hid from this feed on this device. */
export async function getHiddenJobIds(kind: FeedKind): Promise<Set<string>> {
  try {
    return parseHiddenJobIds(await AsyncStorage.getItem(HIDDEN_JOBS_STORAGE_KEY[kind]));
  } catch {
    return new Set();
  }
}

/**
 * Hide a job from this feed (device-local) and, when the tradie had applied,
 * withdraw the application — the website's handleDismiss. The job itself is
 * never touched. Storage failures are swallowed like the website's try/catch.
 */
export async function hideJob(
  kind: FeedKind,
  jobId: string,
  opts: { applicationId?: string | null } = {},
): Promise<Set<string>> {
  const next = new Set([...(await getHiddenJobIds(kind)), jobId]);
  try {
    await AsyncStorage.setItem(HIDDEN_JOBS_STORAGE_KEY[kind], serialiseHiddenJobIds(next));
  } catch {
    /* device storage unavailable — the card still hides for this session */
  }
  if (opts.applicationId) {
    const { error } = await db.from('applications').delete().eq('id', opts.applicationId);
    if (error) throw new Error(error.message);
  }
  return next;
}

/* ── Applications ("Applied" badges) ────────────────────────────────── */

export interface MyApplicationIds {
  appliedJobIds: Set<string>;
  /** job_id → application id, for withdraw-on-hide. */
  applicationIds: Record<string, string>;
}

/** The tradie's applications, indexed for the feed cards. */
export async function getMyApplicationJobIds(): Promise<MyApplicationIds> {
  const uid = await requireUserId();
  const { data, error } = await db.from('applications').select('id, job_id').eq('builder_id', uid);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; job_id: string }[];
  const applicationIds: Record<string, string> = {};
  for (const a of rows) applicationIds[a.job_id] = a.id;
  return { appliedJobIds: new Set(rows.map((a) => a.job_id)), applicationIds };
}

/* ── The feed ───────────────────────────────────────────────────────── */

export interface TradieFeedOptions {
  /** The own builder row (trades + coverage). null = no trade filter, no refine. */
  profile: FeedProfile | null | undefined;
  urgency?: UrgencyFilter;
  /** Skip the device-local hidden list (defaults to applying it). */
  includeHidden?: boolean;
  /** Injectable for tests; defaults to the bundled AU geocoder. */
  geocodeFn?: GeocodeFn;
}

/**
 * Open jobs of one kind in the tradie's trade(s), refined to their coverage,
 * urgency-filtered, minus device-hidden ids; Project Jobs additionally sorted
 * with speciality matches first. Newest first otherwise.
 */
export async function listTradieFeed(kind: FeedKind, opts: TradieFeedOptions): Promise<Job[]> {
  const filters = feedKindFilters(kind);
  const trades = builderTradesFor(opts.profile);

  let query = db
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .eq('is_test', false)
    .eq('poster_type', filters.poster_type)
    .order('created_at', { ascending: false });
  if (filters.posting_kind) query = query.eq('posting_kind', filters.posting_kind);
  if (trades.length > 0) query = query.in('trade_category', trades);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const inRange = await filterJobsByBuilderRadius((data ?? []) as Job[], opts.profile, opts.geocodeFn);
  const hidden = opts.includeHidden ? new Set<string>() : await getHiddenJobIds(kind);
  const visible = applyUrgencyFilter(inRange, opts.urgency ?? 'all').filter((j) => !hidden.has(j.id));
  return kind === 'project' ? sortBySpecialityMatch(visible, viewerSpecialisations(opts.profile)) : visible;
}
