/**
 * lib/enterprise-hub/analytics.ts — the enterprise Analytics page numbers.
 *
 * Port of ~/bldesy-web/app/enterprise/analytics/page.tsx `loadData` and its
 * inline helpers (cutoff, fmtDate, relTime, the sorted per-job table, the 2–3
 * job compare). Only what that page computes — nothing invented:
 *   job views, applications, view→apply rate, fill rate, jobs posted, avg
 *   apps/job (1 decimal), positions filled, workers needed; applications per
 *   day; top applicant trades / suburbs (from public_builder_profiles); the
 *   per-job breakdown rows.
 *
 * Reads are the business's own rows under RLS (jobs.customer_id,
 * applications on those jobs, job_views on those jobs) plus the PII-safe
 * `public_builder_profiles` view for the applicants' trade + suburb.
 */
import { requireUserId } from '@/lib/data/own-session';
import { db } from '@/lib/supabase';

export type EnterprisePeriod = '7d' | '30d' | '90d' | 'all';

export const ENTERPRISE_PERIODS: readonly { key: EnterprisePeriod; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
];

/** Compare-jobs series colours (indigo, teal, amber). */
export const COMPARE_COLORS = ['#4f46e5', '#0D7C66', '#d97706'] as const;

export const MAX_COMPARE = 3;

export interface EnterpriseAnalyticsMetrics {
  jobViews: number;
  applications: number;
  viewToApplyRate: number;
  fillRate: number;
  jobsPosted: number;
  avgAppsPerJob: number;
  positionsFilled: number;
  workersNeeded: number;
}

export const EMPTY_ENTERPRISE_METRICS: EnterpriseAnalyticsMetrics = {
  jobViews: 0,
  applications: 0,
  viewToApplyRate: 0,
  fillRate: 0,
  jobsPosted: 0,
  avgAppsPerJob: 0,
  positionsFilled: 0,
  workersNeeded: 0,
};

/* ── Pure helpers ───────────────────────────────────────────────────── */

/** ISO cutoff for the period (null = all time). */
export function periodCutoff(period: EnterprisePeriod, now: number = Date.now()): string | null {
  if (period === 'all') return null;
  const d = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(now - d * 86_400_000).toISOString();
}

/** "14 Aug" — the chart tick label. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en-AU', { month: 'short' })}`;
}

/** "—" · "5m" · "3h" · "2d" — the per-job table's "1st App" cell. */
export function relTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return '—';
  const ms = now - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export interface AnalyticsJobInput {
  id: string;
  title: string;
  trade_category: string;
  suburb: string;
  status: string;
  workers_needed: number | null;
  created_at: string;
}

export interface AnalyticsAppInput {
  id: string;
  status: string;
  created_at: string;
  job_id: string;
  builder_id: string;
}

export interface AnalyticsViewInput {
  job_id: string;
  created_at: string;
}

/** Trade + suburb of an applicant (public_builder_profiles). */
export interface ApplicantOrigin {
  trade: string | null;
  suburb: string | null;
}

export function computeAnalyticsMetrics(
  jobs: readonly AnalyticsJobInput[],
  apps: readonly AnalyticsAppInput[],
  viewsCount: number,
): EnterpriseAnalyticsMetrics {
  const accepted = apps.filter((a) => a.status === 'accepted').length;
  const totalPos = jobs.reduce((s, j) => s + (j.workers_needed || 1), 0);
  return {
    jobViews: viewsCount,
    applications: apps.length,
    viewToApplyRate: viewsCount > 0 ? Math.round((apps.length / viewsCount) * 100) : 0,
    fillRate: totalPos > 0 ? Math.round((accepted / totalPos) * 100) : 0,
    jobsPosted: jobs.length,
    avgAppsPerJob: jobs.length > 0 ? Math.round((apps.length / jobs.length) * 10) / 10 : 0,
    positionsFilled: accepted,
    workersNeeded: totalPos,
  };
}

export interface DailyApps {
  /** Chart label ("14 Aug"). */
  date: string;
  count: number;
}

/** Applications per day, ascending, labelled for the chart. */
export function dailyApplications(apps: readonly AnalyticsAppInput[]): DailyApps[] {
  const dm: Record<string, number> = {};
  for (const a of apps) {
    const d = a.created_at.slice(0, 10);
    dm[d] = (dm[d] || 0) + 1;
  }
  return Object.entries(dm)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: fmtDate(date), count }));
}

export interface RankedItem {
  name: string;
  count: number;
}

/** Top-5 applicant trades or suburbs; applicants without a public profile count as "Unknown". */
export function rankApplicantOrigins(
  apps: readonly AnalyticsAppInput[],
  origins: ReadonlyMap<string, ApplicantOrigin>,
  field: 'trade' | 'suburb',
  limit: number = 5,
): RankedItem[] {
  const counts: Record<string, number> = {};
  for (const a of apps) {
    const key = origins.get(a.builder_id)?.[field] || 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export interface AnalyticsJobRow {
  id: string;
  title: string;
  suburb: string;
  trade_category: string;
  status: string;
  workers_needed: number;
  apps: number;
  views: number;
  fillRate: number;
  /** created_at of the earliest application, or null. */
  firstApp: string | null;
}

/** One row per job (most applications first). */
export function buildJobRows(
  jobs: readonly AnalyticsJobInput[],
  apps: readonly AnalyticsAppInput[],
  views: readonly AnalyticsViewInput[],
): AnalyticsJobRow[] {
  return jobs
    .map((j) => {
      const jA = apps.filter((a) => a.job_id === j.id);
      const jV = views.filter((v) => v.job_id === j.id).length;
      const jAcc = jA.filter((a) => a.status === 'accepted').length;
      const wn = j.workers_needed || 1;
      const first = jA.reduce<string | null>(
        (earliest, a) => (earliest === null || a.created_at < earliest ? a.created_at : earliest),
        null,
      );
      return {
        id: j.id,
        title: j.title,
        suburb: j.suburb,
        trade_category: j.trade_category,
        status: j.status,
        workers_needed: wn,
        apps: jA.length,
        views: jV,
        fillRate: wn > 0 ? Math.round((jAcc / wn) * 100) : 0,
        firstApp: first,
      };
    })
    .sort((a, b) => b.apps - a.apps);
}

export type JobRowSort = 'apps' | 'views' | 'fill';

export const JOB_ROW_SORTS: readonly { key: JobRowSort; label: string }[] = [
  { key: 'apps', label: 'Most Apps' },
  { key: 'views', label: 'Most Views' },
  { key: 'fill', label: 'Fill Rate' },
];

export function sortJobRows(rows: readonly AnalyticsJobRow[], sort: JobRowSort): AnalyticsJobRow[] {
  const out = [...rows];
  if (sort === 'views') out.sort((a, b) => b.views - a.views);
  else if (sort === 'fill') out.sort((a, b) => b.fillRate - a.fillRate);
  else out.sort((a, b) => b.apps - a.apps);
  return out;
}

/** Select / deselect a job for the compare panel — capped at MAX_COMPARE. */
export function toggleCompareId(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  if (ids.length >= MAX_COMPARE) return [...ids];
  return [...ids, id];
}

export type CompareMetric = 'apps' | 'views' | 'fillRate';

export const COMPARE_METRICS: readonly { key: CompareMetric; label: string }[] = [
  { key: 'apps', label: 'Applications' },
  { key: 'views', label: 'Views' },
  { key: 'fillRate', label: 'Fill Rate' },
];

export interface CompareBar {
  id: string;
  value: number;
  /** Bar width as a percentage of the largest value — never below 3 so a zero still shows. */
  pct: number;
}

export function compareBars(
  rows: readonly AnalyticsJobRow[],
  ids: readonly string[],
  metric: CompareMetric,
): CompareBar[] {
  const vals = ids.map((id) => {
    const r = rows.find((x) => x.id === id);
    return r ? r[metric] : 0;
  });
  const max = Math.max(...vals, 1);
  return ids.map((id, i) => {
    const pct = max > 0 ? (vals[i] / max) * 100 : 0;
    return { id, value: vals[i], pct: Math.max(pct, 3) };
  });
}

/* ── The page's data ────────────────────────────────────────────────── */

export interface EnterpriseAnalyticsData {
  period: EnterprisePeriod;
  metrics: EnterpriseAnalyticsMetrics;
  dailyApps: DailyApps[];
  topTrades: RankedItem[];
  topLocations: RankedItem[];
  jobRows: AnalyticsJobRow[];
}

/** Everything the analytics screen renders, loaded the way the website page does. */
export async function getEnterpriseAnalytics(period: EnterprisePeriod): Promise<EnterpriseAnalyticsData> {
  const uid = await requireUserId();
  const c = periodCutoff(period);

  const { data: jobsData, error: jobsError } = await db
    .from('jobs')
    .select('id, title, trade_category, suburb, status, workers_needed, created_at')
    .eq('customer_id', uid);
  if (jobsError) throw new Error(jobsError.message);
  const jobs = (jobsData ?? []) as AnalyticsJobInput[];
  const jobIds = jobs.map((j) => j.id);
  if (jobIds.length === 0) {
    return { period, metrics: EMPTY_ENTERPRISE_METRICS, dailyApps: [], topTrades: [], topLocations: [], jobRows: [] };
  }

  let appsQ = db
    .from('applications')
    .select('id, status, created_at, job_id, builder_id')
    .in('job_id', jobIds)
    .order('created_at', { ascending: true });
  if (c) appsQ = appsQ.gte('created_at', c);

  let views: AnalyticsViewInput[] = [];
  try {
    let vQ = db.from('job_views').select('job_id, created_at').in('job_id', jobIds);
    if (c) vQ = vQ.gte('created_at', c);
    const { data: vd } = await vQ;
    views = (vd ?? []) as AnalyticsViewInput[];
  } catch {
    /* job_views is best-effort — the page renders without it */
  }

  const { data: appsData, error: appsError } = await appsQ;
  if (appsError) throw new Error(appsError.message);
  const apps = (appsData ?? []) as AnalyticsAppInput[];

  const builderIds = [...new Set(apps.map((a) => a.builder_id))];
  const origins = new Map<string, ApplicantOrigin>();
  if (builderIds.length > 0) {
    const { data: bp } = await db
      .from('public_builder_profiles')
      .select('user_id, trade_category, suburb')
      .in('user_id', builderIds);
    for (const p of (bp ?? []) as { user_id: string | null; trade_category: string | null; suburb: string | null }[]) {
      if (p.user_id) origins.set(p.user_id, { trade: p.trade_category, suburb: p.suburb });
    }
  }

  return {
    period,
    metrics: computeAnalyticsMetrics(jobs, apps, views.length),
    dailyApps: dailyApplications(apps),
    topTrades: rankApplicantOrigins(apps, origins, 'trade'),
    topLocations: rankApplicantOrigins(apps, origins, 'suburb'),
    jobRows: buildJobRows(jobs, apps, views),
  };
}
