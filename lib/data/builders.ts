/**
 * Public tradie profile data — ports of:
 *   - ~/bldesy-web/lib/queries/builders.ts `getBuilderById` / `getBuilderBySlug`
 *     (PROFILE_SELECT, status gate, guest PII nulling) and `getBuilderReviews`
 *   - ~/bldesy-web/components/builder/like-button.tsx (public like count via the
 *     SECURITY DEFINER RPC `builder_like_count`, own-like lookup, optimistic
 *     toggle with revert)
 *   - "similar tradies" = `getBuildersByTrade` reuse (lib/data/search.ts)
 *
 * All cross-user reads use the PII-safe `public_builder_profiles` /
 * `public_profiles` views. Never call the revoked `get_builder_contact` RPC —
 * `phone`/`email`/`website` come from the view row and a reveal is METERED by
 * `revealContact()` in lib/data/contact.ts.
 */
import { useCallback, useEffect, useState } from 'react';

import { useUser } from '@/lib/auth-context';
import { getBuildersByTrade } from '@/lib/data/search';
import { db } from '@/lib/supabase';
import type { BuilderWithProfile, Profile, Review } from '@/types';

/**
 * Verbatim PROFILE_SELECT of the website's public profile page. Every column
 * exists on the `public_builder_profiles` Row type; the view exposes NO
 * billing columns (plan_state / subscription_* / stripe_*), so never add them.
 */
export const publicBuilderProfileSelect =
  'user_id, slug, business_name, trade_category, suburb, postcode, bio, phone, email, website, profile_photo_url, cover_photo_url, cover_color, display_images, projects, credentials, faqs, team_members, availability, credentials_verified, service_areas, trade_categories, licensed_states, response_time, contact_name, state, latitude, longitude, radius_km, specialisations, bldesy_score, display_bldesy_score, availability_display_mode, next_available_date, occupied_dates, profile_visibility, accepting_enquiries';

/**
 * Null contact PII unless the caller holds a real (non-anonymous) session —
 * the website's guest nulling, kept as defence in depth: since migration
 * 20260716 the view itself already nulls phone/email for guests and
 * anonymous onboarding sessions.
 */
export function stripContactPii<T extends { phone: string | null; email: string | null }>(
  row: T,
  contactable: boolean,
): T {
  if (contactable) return row;
  return { ...row, phone: null, email: null };
}

async function hasContactableSession(): Promise<boolean> {
  const { data } = await db.auth.getSession();
  const user = data.session?.user;
  return !!user && user.is_anonymous !== true;
}

async function getBuilderWhere(
  column: 'user_id' | 'slug',
  value: string,
): Promise<BuilderWithProfile | null> {
  const { data, error } = await db
    .from('public_builder_profiles')
    .select(publicBuilderProfileSelect)
    .eq(column, value)
    .in('status', ['approved', 'active'])
    .maybeSingle();

  if (error) {
    console.warn('getBuilder error', column, error.message);
    return null;
  }
  if (!data) return null;

  return stripContactPii(data as unknown as BuilderWithProfile, await hasContactableSession());
}

/** Full public profile by the tradie's `user_id` (the app's /builder/[id] key). Only approved/active rows. */
export async function getBuilderById(userId: string): Promise<BuilderWithProfile | null> {
  return getBuilderWhere('user_id', userId);
}

/** Slug lookup for the website's keyword profile URLs (/{trade}/{suburb}/{slug}). */
export async function getBuilderBySlug(slug: string): Promise<BuilderWithProfile | null> {
  return getBuilderWhere('slug', slug);
}

/* ───────────────────────────── Reviews ───────────────────────────── */

export type ReviewRow = Pick<
  Review,
  'id' | 'job_id' | 'reviewer_id' | 'reviewee_id' | 'rating' | 'comment' | 'created_at'
>;
export type ReviewerSummary = Pick<Profile, 'name' | 'avatar_url'>;
/**
 * The website's `ReviewWithReviewer` declares `profiles` as required but its
 * query never joins it (the base `profiles` table is RLS-locked), so the
 * reviews section renders "Anonymous" for every review. The app backfills the
 * reviewer from `public_profiles`; null = reviewer not publicly resolvable.
 */
export type ReviewWithReviewer = ReviewRow & { profiles: ReviewerSummary | null };
export type StarBreakdown = Record<1 | 2 | 3 | 4 | 5, number>;

export interface BuilderReviewsResult {
  reviews: ReviewWithReviewer[];
  averageRating: number;
  totalReviews: number;
  starBreakdown: StarBreakdown;
}

export function emptyReviewsResult(): BuilderReviewsResult {
  return {
    reviews: [],
    averageRating: 0,
    totalReviews: 0,
    starBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

/** Average + star histogram (ratings clamped to 1..5 after rounding), as the website computes them. */
export function summariseReviews<T extends { rating: number }>(
  reviews: T[],
): Pick<BuilderReviewsResult, 'averageRating' | 'totalReviews' | 'starBreakdown'> {
  const totalReviews = reviews.length;
  const starBreakdown: StarBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  for (const review of reviews) {
    ratingSum += review.rating;
    const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    starBreakdown[star]++;
  }
  const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 0;
  return { averageRating, totalReviews, starBreakdown };
}

/** Attach `public_profiles` rows to reviews by `reviewer_id`. */
export function attachReviewers(
  rows: ReviewRow[],
  reviewers: readonly { id: string; name: string; avatar_url: string | null }[],
): ReviewWithReviewer[] {
  const byId = new Map(reviewers.map((r) => [r.id, r]));
  return rows.map((row) => {
    const reviewer = byId.get(row.reviewer_id);
    return {
      ...row,
      profiles: reviewer ? { name: reviewer.name, avatar_url: reviewer.avatar_url } : null,
    };
  });
}

/**
 * All reviews for a builder (newest first, max 50), including reviewer
 * identity, average rating, and star breakdown. Read failures degrade to the
 * empty result exactly as on the website.
 */
export async function getBuilderReviews(builderUserId: string): Promise<BuilderReviewsResult> {
  const { data, error } = await db
    .from('reviews')
    .select('id, job_id, reviewer_id, reviewee_id, rating, comment, created_at')
    .eq('reviewee_id', builderUserId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('getBuilderReviews error', error.message);
    return emptyReviewsResult();
  }

  const rows = (data ?? []) as ReviewRow[];
  const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id))];
  let reviewers: { id: string; name: string; avatar_url: string | null }[] = [];
  if (reviewerIds.length > 0) {
    const { data: profiles, error: profilesError } = await db
      .from('public_profiles')
      .select('id, name, avatar_url')
      .in('id', reviewerIds);
    if (profilesError) {
      console.warn('getBuilderReviews reviewers error', profilesError.message);
    }
    reviewers = profiles ?? [];
  }

  const reviews = attachReviewers(rows, reviewers);
  return { reviews, ...summariseReviews(reviews) };
}

/* ───────────────────────────── Likes ───────────────────────────── */

type UntypedRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

/**
 * Public like count via the SECURITY DEFINER RPC `builder_like_count` — the
 * `builder_likes` table is locked to own-likes so the (user, builder) graph
 * isn't readable. RPC not in the generated Database types — cast to access it.
 */
export async function getBuilderLikeCount(builderUserId: string): Promise<number> {
  const rpc = db.rpc as unknown as UntypedRpc;
  const { data, error } = await rpc('builder_like_count', { p_builder_id: builderUserId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Whether `userId` has liked this tradie (own-row read under RLS). */
export async function hasLikedBuilder(builderUserId: string, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from('builder_likes')
    .select('id')
    .eq('builder_id', builderUserId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Like (`true`) or unlike (`false`) — the website's insert / delete pair. */
export async function setBuilderLike(
  builderUserId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  const { error } = liked
    ? await db.from('builder_likes').insert({ user_id: userId, builder_id: builderUserId })
    : await db.from('builder_likes').delete().eq('user_id', userId).eq('builder_id', builderUserId);
  if (error) throw new Error(error.message);
}

export type LikeToggleOutcome = 'toggled' | 'login_required' | 'own_profile' | 'error';

interface LikeState {
  builderUserId: string;
  count: number;
  liked: boolean;
}

/**
 * Data half of the website's LikeButton: public count + own like, optimistic
 * toggle that reverts on error. `loaded` is false until the first read
 * resolves (the website renders nothing until then). Guests get
 * `login_required` from `toggle()` — the screen routes to login, as the web
 * pushes to /login?redirect=… — and a tradie can't like their own profile.
 */
export function useBuilderLike(builderUserId: string): {
  count: number | null;
  liked: boolean;
  loaded: boolean;
  isOwnProfile: boolean;
  toggle: () => Promise<LikeToggleOutcome>;
} {
  const { authedUser } = useUser();
  const userId = authedUser?.id ?? null;
  const [state, setState] = useState<LikeState | null>(null);
  const isOwnProfile = userId === builderUserId;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      // Web parity: a failed count read shows 0, not an error.
      getBuilderLikeCount(builderUserId).catch(() => 0),
      userId ? hasLikedBuilder(builderUserId, userId).catch(() => false) : Promise.resolve(false),
    ]).then(([count, liked]) => {
      if (cancelled) return;
      setState({ builderUserId, count, liked });
    });
    return () => {
      cancelled = true;
    };
  }, [builderUserId, userId]);

  const loaded = state?.builderUserId === builderUserId;
  const count = loaded ? state.count : null;
  const liked = loaded ? state.liked : false;

  const toggle = useCallback(async (): Promise<LikeToggleOutcome> => {
    if (!userId) return 'login_required';
    if (isOwnProfile) return 'own_profile';
    const wasLiked = liked;

    // Optimistic update
    setState((s) =>
      s ? { ...s, liked: !wasLiked, count: s.count + (wasLiked ? -1 : 1) } : s,
    );
    try {
      await setBuilderLike(builderUserId, userId, !wasLiked);
      return 'toggled';
    } catch (e) {
      console.warn('Failed to toggle like:', e instanceof Error ? e.message : e);
      // Revert
      setState((s) =>
        s ? { ...s, liked: wasLiked, count: s.count + (wasLiked ? 1 : -1) } : s,
      );
      return 'error';
    }
  }, [builderUserId, userId, isOwnProfile, liked]);

  return { count, liked, loaded, isOwnProfile, toggle };
}

/* ───────────────────────────── Similar tradies ───────────────────────────── */

/**
 * Other searchable tradies in the same trade, excluding the profile being
 * viewed. Over-fetches by one so the exclusion doesn't shorten the list.
 */
export async function getSimilarBuilders(
  tradeSlug: string,
  excludeUserId: string,
  limit = 6,
): Promise<BuilderWithProfile[]> {
  const rows = await getBuildersByTrade(tradeSlug, limit + 1);
  return rows.filter((b) => b.user_id !== excludeUserId).slice(0, limit);
}
