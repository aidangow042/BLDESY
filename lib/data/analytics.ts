/**
 * lib/data/analytics.ts — the tradie Analytics page numbers.
 *
 * Port of ~/bldesy-web/app/portal/analytics/page.tsx. Only what that page
 * computes — nothing invented:
 *   profile completeness (same formula as the dashboard ring, incl. the
 *   auth-side email-verified extra), applications in the period (total, won,
 *   win rate, per-day counts, top trades / suburbs of the jobs applied to),
 *   profile views (deduped server-side: people, not pageloads), saves,
 *   messages received (conversations with last_message_at in the period),
 *   and the ALL-TIME review count + average rating (deliberately ignoring the
 *   period pills, fixed 2026-07-28).
 *
 * Every read is the tradie's own rows under RLS (profile_views.builder_user_id,
 * saved_builders.builder_id, conversations user1/user2, reviews.reviewee_id,
 * applications.builder_id).
 *
 * `search_appearances` is NOT read: the website analytics page never touches
 * it (it is written server-side and only read by the weekly-pulse cron).
 */
import { db } from '@/lib/supabase';
import {
  getProfileCompleteness,
  PROFILE_COMPLETENESS_COLUMNS,
} from '@/lib/web/profile-completeness';
import type { ApplicationStatus } from '@/types/database';

import { requireUserId } from './own-session';
import { completenessExtrasFor, type AuthUserFacts } from './portal';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export const ANALYTICS_PERIODS: readonly AnalyticsPeriod[] = ['7d', '30d', '90d', 'all'];

const PERIOD_DAYS: Record<Exclude<AnalyticsPeriod, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

/* ── Pure window / aggregation helpers ──────────────────────────────── */

/** ISO cutoff for a period (null = all time), relative to `now`. */
export function periodCutoff(period: AnalyticsPeriod, now: number = Date.now()): string | null {
  if (period === 'all') return null;
  return new Date(now - PERIOD_DAYS[period] * 86_400_000).toISOString();
}

export interface AnalyticsApplicationRow {
  id: string;
  status: ApplicationStatus | string;
  created_at: string;
  job_id: string;
}

export interface ApplicationOutcomes {
  totalApplications: number;
  jobsWon: number;
  /** accepted ÷ applied, rounded; 0 with no applications. */
  winRate: number;
}

export function aggregateApplications(apps: readonly AnalyticsApplicationRow[]): ApplicationOutcomes {
  const accepted = apps.filter((a) => a.status === 'accepted').length;
  return {
    totalApplications: apps.length,
    jobsWon: accepted,
    winRate: apps.length > 0 ? Math.round((accepted / apps.length) * 100) : 0,
  };
}

export interface DailyCount {
  /** "YYYY-MM-DD" (UTC slice of created_at, as the website does). */
  date: string;
  count: number;
}

/** Applications per day, ascending by date. */
export function dailyApplicationCounts(apps: readonly AnalyticsApplicationRow[]): DailyCount[] {
  const byDay: Record<string, number> = {};
  for (const a of apps) {
    const d = a.created_at.slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface AnalyticsJobRow {
  id: string;
  trade_category: string;
  suburb: string;
}

/** Top-N values of a job field across the applications (ties keep insertion order). */
export function topCounts(
  apps: readonly AnalyticsApplicationRow[],
  jobs: readonly AnalyticsJobRow[],
  field: 'trade_category' | 'suburb',
  limit: number = 5,
): NamedCount[] {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const counts: Record<string, number> = {};
  for (const a of apps) {
    const j = byId.get(a.job_id);
    if (j) counts[j[field]] = (counts[j[field]] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export interface RatingSummary {
  reviewCount: number;
  /** 1-decimal average; 0 when there are no reviews (the tile shows "—"). */
  avgRating: number;
}

export function averageRating(reviews: readonly { rating: number }[]): RatingSummary {
  if (reviews.length === 0) return { reviewCount: 0, avgRating: 0 };
  const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  return { reviewCount: reviews.length, avgRating: Math.round((total / reviews.length) * 10) / 10 };
}

/** "14 Aug" — the website's chart tick label for a YYYY-MM-DD key. */
export function formatDayLabel(ymd: string): string {
  const d = new Date(ymd);
  return `${d.getDate()} ${d.toLocaleString('en-AU', { month: 'short' })}`;
}

/* ── The page's data ────────────────────────────────────────────────── */

export interface TradieAnalytics {
  period: AnalyticsPeriod;
  profileComplete: number;
  profileViews: number;
  profileSaves: number;
  messagesReceived: number;
  totalApplications: number;
  jobsWon: number;
  winRate: number;
  reviewCount: number;
  avgRating: number;
  dailyApplications: DailyCount[];
  topTrades: NamedCount[];
  topLocations: NamedCount[];
}

/**
 * Everything /portal/analytics renders for one period. `user` supplies the
 * auth-side completeness extra (email verified) so the % agrees with the
 * dashboard.
 */
export async function getTradieAnalytics(
  period: AnalyticsPeriod,
  user: AuthUserFacts,
): Promise<TradieAnalytics> {
  const uid = await requireUserId();
  const cutoff = periodCutoff(period);

  // Profile completeness — same weighted formula as the dashboard ring.
  const profileReq = db
    .from('builder_profiles')
    .select(PROFILE_COMPLETENESS_COLUMNS)
    .eq('user_id', uid)
    .maybeSingle();

  let appsQ = db
    .from('applications')
    .select('id, status, created_at, job_id')
    .eq('builder_id', uid)
    .order('created_at', { ascending: true });
  if (cutoff) appsQ = appsQ.gte('created_at', cutoff);

  let viewsQ = db
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('builder_user_id', uid);
  if (cutoff) viewsQ = viewsQ.gte('created_at', cutoff);

  let savesQ = db
    .from('saved_builders')
    .select('id', { count: 'exact', head: true })
    .eq('builder_id', uid);
  if (cutoff) savesQ = savesQ.gte('created_at', cutoff);

  // Conversations where this builder is a participant and the last message
  // lands in the period — "inbound enquiries" without double-counting threads.
  let convosQ = db
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
  if (cutoff) convosQ = convosQ.gte('last_message_at', cutoff);

  // Reviews + rating are ALL-TIME on purpose.
  const reviewsReq = db.from('reviews').select('rating, created_at').eq('reviewee_id', uid);

  const [profileRes, appsRes, viewsRes, savesRes, convosRes, reviewsRes] = await Promise.all([
    profileReq,
    appsQ,
    viewsQ,
    savesQ,
    convosQ,
    reviewsReq,
  ]);
  for (const res of [profileRes, appsRes, viewsRes, savesRes, convosRes, reviewsRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const profileComplete = profileRes.data
    ? getProfileCompleteness(
        profileRes.data as unknown as Record<string, unknown>,
        completenessExtrasFor(user),
      )
    : 0;

  const apps = (appsRes.data ?? []) as AnalyticsApplicationRow[];
  const outcomes = aggregateApplications(apps);

  const jobIds = [...new Set(apps.map((a) => a.job_id))];
  let jobs: AnalyticsJobRow[] = [];
  if (jobIds.length > 0) {
    const { data, error } = await db.from('jobs').select('id, trade_category, suburb').in('id', jobIds);
    if (error) throw new Error(error.message);
    jobs = (data ?? []) as AnalyticsJobRow[];
  }

  const rating = averageRating((reviewsRes.data ?? []) as { rating: number }[]);

  return {
    period,
    profileComplete,
    profileViews: viewsRes.count ?? 0,
    profileSaves: savesRes.count ?? 0,
    messagesReceived: convosRes.count ?? 0,
    ...outcomes,
    ...rating,
    dailyApplications: dailyApplicationCounts(apps),
    topTrades: topCounts(apps, jobs, 'trade_category'),
    topLocations: topCounts(apps, jobs, 'suburb'),
  };
}
