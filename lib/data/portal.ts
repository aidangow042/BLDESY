/**
 * lib/data/portal.ts — the tradie portal dashboard data layer.
 *
 * Port of:
 *   ~/bldesy-web/app/portal/page.tsx              (metrics, activity feed, completeness)
 *   ~/bldesy-web/app/portal/portal-shell.tsx      (own-profile fetch/refresh, plan-state banners)
 *   ~/bldesy-web/components/portal/status-card.tsx (derivePortalStatus input, pause / go-live)
 *   ~/bldesy-web/components/eoi/eoi-dashboard-cards.tsx (leads, dismiss, flag junk)
 *   ~/bldesy-web/components/referrals/referral-dashboard-card.tsx (dismiss persists to the row)
 *   ~/bldesy-web/lib/portal/profile-status.ts     (via the verbatim mirror lib/web/portal/profile-status)
 *
 * Own-row reads/writes go straight to `builder_profiles` under RLS exactly as
 * the website's browser client does. Nothing here renders or owns copy — the
 * screens port the website components on top of these results.
 */
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { api } from '@/lib/api';
import { useUser } from '@/lib/auth-context';
import { dispatchProfileChanged, onProfileChanged } from '@/lib/events/profile';
import { LAUNCH_MODE } from '@/lib/launch-flags';
import { db } from '@/lib/supabase';
import { verifiedCredentialFlags } from '@/lib/web/credentials';
import { expiringInsurance, type ExpiryWarning } from '@/lib/web/portal/credential-expiry';
import {
  derivePortalStatus,
  type ProfileStatusInput,
  type ProfileStatusResult,
} from '@/lib/web/portal/profile-status';
import {
  completenessChecklist,
  getProfileCompleteness,
  type CompletenessExtras,
  type CompletenessItem,
} from '@/lib/web/profile-completeness';
import type { ApplicationStatus, Database } from '@/types/database';

import { requireUserId } from './own-session';

type BuilderProfileRow = Database['public']['Tables']['builder_profiles']['Row'];

/* ── Own-profile select ─────────────────────────────────────────────── */

/**
 * Every own-row column the dashboard, status card, completeness ring, billing,
 * availability and visibility screens read. The website shell selects `*`;
 * the app enumerates so a renamed column fails `tsc` here instead of at runtime.
 *
 * Enumerated from app/portal/page.tsx, portal-shell.tsx, status-card.tsx,
 * billing/page.tsx, availability/page.tsx, profile-visibility/page.tsx,
 * settings/page.tsx, pending/page.tsx and lib/profile-completeness.ts.
 * `Pick<Row, …>` below is the compile-time guarantee each one exists.
 */
export const OWN_PROFILE_COLUMNS = [
  'user_id',
  'slug',
  'business_name',
  'trading_name',
  'contact_name',
  'trade_category',
  'trade_categories',
  'specialisations',
  'suburb',
  'postcode',
  'state',
  'latitude',
  'longitude',
  'radius_km',
  'service_areas',
  'bio',
  'phone',
  'email',
  'website',
  'abn',
  'license_key',
  'profile_photo_url',
  'cover_photo_url',
  'cover_color',
  'display_images',
  'projects',
  'team_members',
  'faqs',
  'credentials',
  'credentials_verified',
  'licensed_states',
  'status',
  'approved',
  'approved_at',
  'rejection_reason',
  'bldesy_review_status',
  'bldesy_score',
  'bldesy_score_breakdown',
  'display_bldesy_score',
  'plan_state',
  'qualified_contact_count',
  'grace_ends_at',
  'card_on_file_at',
  'card_required_at',
  'billing_interval',
  'subscription_status',
  'subscription_tier',
  'subscription_plan',
  'stripe_subscription_id',
  'search_paused_at',
  'availability',
  'availability_display_mode',
  'next_available_date',
  'occupied_dates',
  'response_time',
  'profile_visibility',
  'sms_alerts_enabled',
  'referral_card_dismissed_at',
] as const;

export type OwnProfileColumn = (typeof OWN_PROFILE_COLUMNS)[number];

/** PostgREST select string for {@link OWN_PROFILE_COLUMNS}. */
export const OWN_PROFILE_SELECT: string = OWN_PROFILE_COLUMNS.join(', ');

/** The tradie's OWN builder_profiles row, as the portal screens see it. */
export type OwnBuilderProfile = Pick<BuilderProfileRow, OwnProfileColumn>;

/**
 * Read the signed-in tradie's own builder_profiles row (RLS: owner only).
 * Resolves null when the account has no tradie profile — the website shows
 * its "No tradie profile on this account yet" card for that (portal/layout.tsx).
 */
export async function getOwnBuilderProfile(userId?: string): Promise<OwnBuilderProfile | null> {
  const uid = userId ?? (await requireUserId());
  const { data, error } = await db
    .from('builder_profiles')
    .select(OWN_PROFILE_SELECT)
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as OwnBuilderProfile | null) ?? null;
}

export interface OwnBuilderProfileState {
  profile: OwnBuilderProfile | null;
  loading: boolean;
  error: string | null;
  /** Re-read the row — the app twin of PortalShell.refreshProfile(). */
  refresh: () => Promise<void>;
}

/**
 * The app twin of the website's PortalContext (`usePortal()`): the own row,
 * refreshed on demand and whenever any flow dispatches profile-changed
 * (subscription synced, paused, approved…).
 */
export function useOwnBuilderProfile(): OwnBuilderProfileState {
  const { user, loading: authLoading } = useUser();
  // user (not authedUser): anonymous-onboarding tradies own real rows.
  const uid = user?.id ?? null;
  const [profile, setProfile] = useState<OwnBuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const next = await getOwnBuilderProfile(uid);
      setProfile(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    void (async () => {
      if (!uid) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      try {
        const next = await getOwnBuilderProfile(uid);
        if (!active) return;
        setProfile(next);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    const off = onProfileChanged(() => {
      void refresh();
    });
    return () => {
      active = false;
      off();
    };
  }, [authLoading, uid, refresh]);

  return { profile, loading: authLoading || loading, error, refresh };
}

/* ── Status card + completeness ─────────────────────────────────────── */

/** The auth-side facts the status card and the % tile read off `user`. */
export type AuthUserFacts = Pick<User, 'email' | 'email_confirmed_at'> | null | undefined;

/**
 * Email verification counts toward completeness only where an email exists —
 * phone-only accounts carry auth email "" (not null), hence `||` not `??`
 * (app/portal/page.tsx, components/portal/status-card.tsx).
 */
export function completenessExtrasFor(user: AuthUserFacts): CompletenessExtras | undefined {
  const email = user?.email || null;
  return email ? { emailVerified: !!user?.email_confirmed_at } : undefined;
}

export type PortalStatusProfile = Pick<
  OwnBuilderProfile,
  | 'status'
  | 'search_paused_at'
  | 'credentials'
  | 'credentials_verified'
  | 'service_areas'
  | 'profile_photo_url'
  | 'display_images'
> &
  Record<string, unknown>;

/**
 * Exactly what components/portal/status-card.tsx hands derivePortalStatus():
 * the ABN pillar is the "verified" anchor (mirror of the SQL listing bar,
 * migration 20260807) and a photo is the profile photo OR ≥1 display image.
 */
export function portalStatusInputFor(
  profile: PortalStatusProfile,
  user: AuthUserFacts,
): ProfileStatusInput {
  const email = user?.email || null;
  return {
    status: profile.status,
    searchPausedAt: profile.search_paused_at ?? null,
    completeness: getProfileCompleteness(profile, completenessExtrasFor(user)),
    hasEmail: !!email,
    emailVerified: !!email && !!user?.email_confirmed_at,
    credentialsVerified: verifiedCredentialFlags(profile).abn,
    hasServiceArea: (profile.service_areas?.length ?? 0) > 0,
    hasPhoto:
      !!profile.profile_photo_url ||
      (Array.isArray(profile.display_images) && profile.display_images.length > 0),
    launchMode: LAUNCH_MODE,
  };
}

/** THE dashboard status card state — one card, five states (lib/portal/profile-status.ts). */
export function getPortalStatus(
  profile: PortalStatusProfile,
  user: AuthUserFacts,
): ProfileStatusResult {
  return derivePortalStatus(portalStatusInputFor(profile, user));
}

/** 0–100 completeness — same weighted formula as the dashboard ring and Analytics. */
export function getCompleteness(profile: Record<string, unknown>, user: AuthUserFacts): number {
  return getProfileCompleteness(profile, completenessExtrasFor(user));
}

/** The deep-linked checklist behind the % — missing items first, heaviest first. */
export function getCompletenessChecklist(
  profile: Record<string, unknown>,
  user: AuthUserFacts,
): CompletenessItem[] {
  return completenessChecklist(profile, completenessExtrasFor(user));
}

/** Insurance certificates expiring within EXPIRY_WARNING_DAYS (or expired). */
export function getInsuranceExpiryWarnings(
  profile: Pick<OwnBuilderProfile, 'credentials_verified'>,
  now: Date = new Date(),
): ExpiryWarning[] {
  return expiringInsurance(profile.credentials_verified, now);
}

/** Which value-gated banner the portal shell shows above every page, if any. */
export function planStateBanner(
  profile: Pick<OwnBuilderProfile, 'plan_state'> | null | undefined,
): 'paused' | 'past_due' | null {
  if (profile?.plan_state === 'paused') return 'paused';
  if (profile?.plan_state === 'past_due') return 'past_due';
  return null;
}

/* ── Pause / go live ────────────────────────────────────────────────── */

/**
 * The one visibility field the tradie controls directly —
 * builder_profiles.search_paused_at (owner-writable, migration 20260807). A
 * direct row update on the website too (status-card.tsx setPaused,
 * settings/page.tsx handlePauseToggle); pausing never touches verification,
 * reviews or completeness.
 */
export async function setProfilePaused(paused: boolean): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db
    .from('builder_profiles')
    .update({ search_paused_at: paused ? new Date().toISOString() : null })
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
  dispatchProfileChanged();
}

/** Take the profile off search (status card "Pause profile"). */
export function pauseProfile(): Promise<void> {
  return setProfilePaused(true);
}

/** Put the profile back in search (status card "Make profile live"). */
export function goLive(): Promise<void> {
  return setProfilePaused(false);
}

/* ── Referral card dismissal ────────────────────────────────────────── */

/**
 * Dismiss the dashboard Refer & Earn card. Persists to the row (not device
 * storage) so it stays dismissed across devices — referral-dashboard-card.tsx.
 * Best-effort on the website; here the error surfaces so the caller can
 * decide (a failure just means the card reappears next visit).
 */
export async function dismissReferralCard(): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db
    .from('builder_profiles')
    .update({ referral_card_dismissed_at: new Date().toISOString() })
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
}

/* ── Dashboard metrics ──────────────────────────────────────────────── */

export interface ApplicationSummaryRow {
  id: string;
  status: ApplicationStatus | string;
  created_at: string;
  job_id: string;
}

export interface JobSummary {
  id: string;
  title: string;
  trade_category: string;
  suburb: string;
}

export interface ApplicationTotals {
  totalApplications: number;
  accepted: number;
  pending: number;
  rejected: number;
  /** accepted ÷ total, rounded — the dashboard "Accepted" tile subtitle. */
  acceptanceRate: number;
}

export interface RecentActivityItem {
  applicationId: string;
  jobId: string;
  /** null while the job row is unavailable (website renders "..."). */
  jobTitle: string | null;
  status: ApplicationStatus | string;
  createdAt: string;
}

export interface DashboardMetrics extends ApplicationTotals {
  /** Last 8 applications, newest first — the "Recent Activity" feed. */
  recentActivity: RecentActivityItem[];
  jobs: Record<string, JobSummary>;
}

/** Default feed length on the website dashboard. */
export const RECENT_ACTIVITY_LIMIT = 8;

/** The four metric tiles, computed exactly as app/portal/page.tsx does. */
export function summariseApplications(apps: readonly ApplicationSummaryRow[]): ApplicationTotals {
  const totalApplications = apps.length;
  const accepted = apps.filter((a) => a.status === 'accepted').length;
  const pending = apps.filter((a) => a.status === 'pending').length;
  const rejected = apps.filter((a) => a.status === 'rejected').length;
  const acceptanceRate =
    totalApplications > 0 ? Math.round((accepted / totalApplications) * 100) : 0;
  return { totalApplications, accepted, pending, rejected, acceptanceRate };
}

/** Real-data-only activity feed: the newest applications joined to their job title. */
export function recentActivityFrom(
  apps: readonly ApplicationSummaryRow[],
  jobs: Record<string, JobSummary>,
  limit: number = RECENT_ACTIVITY_LIMIT,
): RecentActivityItem[] {
  return apps.slice(0, limit).map((a) => ({
    applicationId: a.id,
    jobId: a.job_id,
    jobTitle: jobs[a.job_id]?.title ?? null,
    status: a.status,
    createdAt: a.created_at,
  }));
}

/**
 * Dashboard metrics — the tradie's applications (newest first) plus the job
 * summaries they point at. Two queries, same as the website page.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const uid = await requireUserId();
  const { data: appData, error } = await db
    .from('applications')
    .select('id, status, created_at, job_id')
    .eq('builder_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const apps = (appData ?? []) as ApplicationSummaryRow[];

  const jobIds = [...new Set(apps.map((a) => a.job_id))];
  let jobs: Record<string, JobSummary> = {};
  if (jobIds.length > 0) {
    const { data: jobRows, error: jobsError } = await db
      .from('jobs')
      .select('id, title, trade_category, suburb')
      .in('id', jobIds);
    if (jobsError) throw new Error(jobsError.message);
    jobs = Object.fromEntries(((jobRows ?? []) as JobSummary[]).map((j) => [j.id, j]));
  }

  return {
    ...summariseApplications(apps),
    recentActivity: recentActivityFrom(apps, jobs),
    jobs,
  };
}

/* ── Expressions of interest (new leads) ────────────────────────────── */

export interface EoiLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  trade_category: string | null;
  created_at: string;
}

/** Website card list length. */
export const EOI_LEADS_LIMIT = 10;

/**
 * Undismissed leads, newest first. RLS scopes the select to
 * auth.uid() = tradie_id; the explicit filter is belt-and-braces.
 */
export async function listOwnEois(limit: number = EOI_LEADS_LIMIT): Promise<EoiLead[]> {
  const uid = await requireUserId();
  const { data, error } = await db
    .from('expressions_of_interest')
    .select('id, name, email, phone, message, trade_category, created_at')
    .eq('tradie_id', uid)
    .eq('status', 'new')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as EoiLead[];
}

/**
 * Clear a lead card. The column grant lets the tradie flip status /
 * dismissed_at and nothing else (eoi-dashboard-cards.tsx).
 */
export async function dismissEoi(id: string): Promise<void> {
  const { error } = await db
    .from('expressions_of_interest')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** POST /api/billing/void-contact result. */
export interface VoidContactResult {
  ok: true;
  voided: number;
  reverted: boolean;
  count: number;
}

/**
 * Junk ≠ dismiss: also voids the enquiry from the billing meter (within the
 * 7-day VOID_WINDOW_DAYS) and is visible in admin. Throws ApiError with the
 * website's strings on 409 (already flagged) / 422 (window expired).
 *
 * NOTE: the route currently authenticates with the cookie client
 * (`createClient()`), so a Bearer-authenticated app call 401s until the web
 * switches it to `createApiClient(request)`.
 */
export async function flagEoiJunk(id: string): Promise<VoidContactResult> {
  return api.post<VoidContactResult>('/api/billing/void-contact', { eoiId: id, reason: 'junk' });
}
