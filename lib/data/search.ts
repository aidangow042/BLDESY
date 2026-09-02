/**
 * Tradie search — data-layer port of ~/bldesy-web/lib/queries/builders.ts
 * (`searchBuilders`, `countSearchableBuildersNear`, `getBuildersByTrade`,
 * `getBuildersCountByTrade`). Same select lists, same DB filters, same JS
 * refine, same scoring and the same deterministic sort tie-breaks. The only
 * substitutions: the app's typed client (`db`) replaces the server client and
 * the app's bundled geocoder (`@/lib/geo`) replaces the website's server-side
 * `geocode()`.
 *
 * Every read is on the PII-safe `public_builder_profiles` view under the ONE
 * searchable predicate (`applySearchableFilters`). `phone`/`email`/
 * `bldesy_score`/`next_available_date` arrive pre-nulled by the view when the
 * tradie hides them or the caller is a guest.
 *
 * NOT ported: `recordSearchAppearancesSafe` (portal "appeared in search"
 * rows, ~/bldesy-web/lib/analytics/search-appearances.ts). It runs inside
 * Next's `after()` with the service-role client — server only. Searches made
 * from the app therefore don't feed a tradie's search-appearance analytics
 * until the website exposes a route for it.
 */
import { distanceKm, geocode } from '@/lib/geo';
import { db } from '@/lib/supabase';
import {
  scoreBuilder,
  type RatingAggregate,
  type ScoreContext,
} from '@/lib/web/builder-scoring';
import { verifiedCredentialFlags } from '@/lib/web/credentials';
import { applySearchableFilters } from '@/lib/web/queries/searchable-filter';
import {
  coverageIncludesPoint,
  coverageKeysForPoint,
  inferStateForPoint,
  parseServiceAreas,
  stateForPostcode,
  type AuState,
} from '@/lib/web/service-areas';
import type {
  BuilderSearchFilters,
  BuilderSearchResult,
  BuilderSortOption,
  BuilderWithProfile,
} from '@/types';

/** One source for the results page size — the search screen imports this. */
export const PAGE_SIZE = 12;

// Bounding-box reach for location matching — generous, refined afterwards
// with exact per-builder distance/coverage checks.
const MAX_RADIUS_KM = 80;

/** Travel radius assumed for a profile that never set `radius_km`. */
export const DEFAULT_RADIUS_KM = 30;

export interface SearchCoords {
  latitude: number;
  longitude: number;
}

export interface SearchBuildersResult {
  builders: BuilderSearchResult[];
  total: number;
  error?: string;
}

/** Verbatim select list of the website's `searchBuilders`. */
export const SEARCH_SELECT =
  'user_id, slug, business_name, trade_category, suburb, postcode, bio, profile_photo_url, availability, credentials, credentials_verified, projects, response_time, trade_categories, service_areas, licensed_states, latitude, longitude, radius_km, display_images, specialisations, created_at, bldesy_score, next_available_date';

/** Verbatim select list of the website's `getBuildersByTrade` (trade landing cards). */
export const TRADE_CARD_SELECT =
  'user_id, slug, business_name, trade_category, suburb, postcode, bio, profile_photo_url, availability, credentials, credentials_verified, projects, response_time, trade_categories, service_areas, licensed_states, display_images, specialisations, latitude, longitude, radius_km, created_at';

const TRADE_SLUG_RE = /^[a-zA-Z0-9_-]+$/;

/* ───────────────────────────── Pure helpers ───────────────────────────── */

/** `"a, b,,c"` → `["a","b","c"]` — the website's comma-list parsing for keywords / specialisations / licensed_in. */
export function parseListParam(raw: string | null | undefined): string[] {
  return raw?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
}

/**
 * Trade slugs from the comma-separated `trade` filter, sanitised to lowercase
 * alphanumerics + hyphen/underscore so they can be interpolated into a
 * PostgREST `.or()` string safely (same regex as the website).
 */
export function sanitiseTradeSlugs(trade: string | null | undefined): string[] {
  return parseListParam(trade).filter((t) => TRADE_SLUG_RE.test(t));
}

/**
 * `.or()` string matching the primary `trade_category` OR the
 * `trade_categories` array for every requested trade. Null when no trades.
 */
export function tradeOrConditions(trades: string[]): string | null {
  if (trades.length === 0) return null;
  return trades
    .flatMap((t) => [`trade_category.eq.${t}`, `trade_categories.cs.{${t}}`])
    .join(',');
}

/**
 * OR-condition string for "could plausibly cover this point": home base
 * inside the bounding box, or service_areas claiming region/state coverage
 * of the searched location. Shared by searchBuilders and the
 * countSearchableBuildersNear supply gate so the two can't drift.
 */
export function areaOrConditions(
  searchCoords: SearchCoords,
  location: string | undefined,
): string {
  // 1 degree of latitude ≈ 111km
  const latDelta = MAX_RADIUS_KM / 111;
  // 1 degree of longitude ≈ 111km * cos(lat)
  const lonDelta = MAX_RADIUS_KM / (111 * Math.cos((searchCoords.latitude * Math.PI) / 180));

  const conditions = [
    `and(latitude.gte.${searchCoords.latitude - latDelta},latitude.lte.${searchCoords.latitude + latDelta},longitude.gte.${searchCoords.longitude - lonDelta},longitude.lte.${searchCoords.longitude + lonDelta})`,
  ];
  const coverageKeys = coverageKeysForPoint(
    searchCoords.latitude,
    searchCoords.longitude,
    location ? stateForPostcode(location) : null,
  );
  if (coverageKeys.length > 0) {
    conditions.push(`service_areas.ov.{${coverageKeys.map((k) => `"${k}"`).join(',')}}`);
  }
  return conditions.join(',');
}

/** The builder fields the post-fetch coverage refine reads. */
export interface CoverageRefinable {
  service_areas?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_km?: number | null;
}

/**
 * Precise filter on the bounding-box results: within travel radius of home
 * base, OR region/state coverage includes the searched point. Profiles
 * without coordinates pass (their coverage claim is what got them here).
 */
export function refineByCoverage<T extends CoverageRefinable>(
  builders: T[],
  searchCoords: SearchCoords,
  searchState: AuState | null,
): T[] {
  return builders.filter((b) => {
    const coverage = parseServiceAreas(b.service_areas);
    if (coverageIncludesPoint(coverage, searchCoords, searchState)) {
      return true;
    }
    if (b.latitude != null && b.longitude != null) {
      const dist = distanceKm(searchCoords.latitude, searchCoords.longitude, b.latitude, b.longitude);
      const radius = b.radius_km ?? DEFAULT_RADIUS_KM;
      return dist <= radius;
    }
    return true;
  });
}

/** JS aggregation of raw review rows → per-tradie average + count. */
export function aggregateRatings(
  rows: readonly { reviewee_id: string; rating: number }[],
): Map<string, RatingAggregate> {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const agg = sums.get(row.reviewee_id) ?? { sum: 0, count: 0 };
    agg.sum += row.rating;
    agg.count += 1;
    sums.set(row.reviewee_id, agg);
  }
  const out = new Map<string, RatingAggregate>();
  for (const [id, agg] of sums) {
    out.set(id, { average: agg.sum / agg.count, count: agg.count });
  }
  return out;
}

const AVAILABILITY_ORDER: Record<string, number> = { available: 0, limited: 1, unavailable: 2 };

// created_at is selected but missing from the (stale) generated Row type.
function createdAtMs(b: BuilderSearchResult): number {
  return new Date((b as { created_at?: string }).created_at ?? 0).getTime();
}

/**
 * Sort in place. Every branch ends in deterministic tie-breaks — without
 * them, equal-score builders keep Postgres heap order, which shuffles
 * between requests. `hasCoords` = a location geocoded; "closest" without one
 * degrades to relevance exactly as on the website.
 */
export function sortSearchResults(
  scored: BuilderSearchResult[],
  sort: BuilderSortOption | undefined,
  hasCoords: boolean,
): BuilderSearchResult[] {
  if (sort === 'rating') {
    // Top Rated: best average first, more reviews break ties, then match
    // strength. Unreviewed builders rank after any reviewed builder.
    scored.sort(
      (a, b) =>
        (b._rating?.average ?? 0) - (a._rating?.average ?? 0) ||
        (b._rating?.count ?? 0) - (a._rating?.count ?? 0) ||
        (b._match?.percent ?? 0) - (a._match?.percent ?? 0),
    );
  } else if (sort === 'closest' && hasCoords) {
    scored.sort(
      (a, b) =>
        (a._distanceKm ?? 9999) - (b._distanceKm ?? 9999) ||
        (b._match?.percent ?? 0) - (a._match?.percent ?? 0),
    );
  } else if (sort === 'available') {
    scored.sort(
      (a, b) =>
        (AVAILABILITY_ORDER[a.availability] ?? 2) - (AVAILABILITY_ORDER[b.availability] ?? 2) ||
        (b._match?.percent ?? 0) - (a._match?.percent ?? 0),
    );
  } else if (sort === 'newest') {
    scored.sort((a, b) => createdAtMs(b) - createdAtMs(a));
  } else {
    // relevance — the default, and the fallback for degenerate combos like
    // "closest" with no location.
    scored.sort(
      (a, b) =>
        (b._match?.percent ?? 0) - (a._match?.percent ?? 0) ||
        (b._rating?.average ?? 0) - (a._rating?.average ?? 0) ||
        (a._distanceKm ?? 9999) - (b._distanceKm ?? 9999),
    );
  }
  return scored;
}

/**
 * count = DB-side total. Once a JS-side filter has run (location refine or
 * verified-only), the honest total is the filtered length.
 */
export function resolveSearchTotal(
  jsFiltered: boolean,
  scoredLength: number,
  dbCount: number | null | undefined,
): number {
  return jsFiltered ? scoredLength : (dbCount ?? 0);
}

/* ───────────────────────────── Data access ───────────────────────────── */

/**
 * Review aggregates for a candidate set — powers the Top Rated sort,
 * relevance tie-breaks and the stars on result cards. Degrades gracefully
 * (results still render, just unrated) when the reviews read fails.
 */
export async function fetchRatingAggregates(userIds: string[]): Promise<Map<string, RatingAggregate>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await db
    .from('reviews')
    .select('reviewee_id, rating')
    .in('reviewee_id', userIds);
  if (error) {
    console.warn('searchBuilders ratings error', error.message);
  }
  return aggregateRatings((data ?? []) as { reviewee_id: string; rating: number }[]);
}

/**
 * Search publicly-listed builders with optional filters, sorting, and
 * pagination — the website's `searchBuilders` algorithm verbatim.
 *
 * Visibility policy (decided 2026-07-05): searchable = status IN
 * ('active','approved') AND accepting_enquiries AND meets_listing_bar
 * (`applySearchableFilters`). Subscriptions gate leads/features, never bare
 * listing.
 */
export async function searchBuilders(filters: BuilderSearchFilters = {}): Promise<SearchBuildersResult> {
  const { trade, location, urgency, sort = 'relevance', page = 1, keywords: keywordsRaw, verified } = filters;
  const keywords = parseListParam(keywordsRaw);
  const specialisations = parseListParam(filters.specialisations);

  // If a location is provided, try to geocode it for radius-based matching
  let searchCoords: SearchCoords | null = null;
  if (location) {
    searchCoords = await geocode(location);
  }
  // State hint for coverage tests — postcode-derived when the search text is
  // a postcode, else inferred from the nearest metro. Same inference the
  // DB-level area filter uses, so DB filter, JS refine and scoring all agree
  // on whether a state-covering builder services this point.
  const searchState: AuState | null = searchCoords
    ? (stateForPostcode(location) ?? inferStateForPoint(searchCoords.latitude, searchCoords.longitude))
    : null;

  let query = applySearchableFilters(
    db.from('public_builder_profiles').select(SEARCH_SELECT, { count: 'exact' }),
  );

  // Filter by licensed state — the "Licensed in" filter chip.
  if (filters.licensed_in) {
    const states = parseListParam(filters.licensed_in);
    if (states.length > 0) {
      query = query.overlaps('licensed_states', states);
    }
  }

  // Trade filter — supports comma-separated multi-trade. Checks both the
  // primary trade_category AND the trade_categories array.
  const tradeOr = tradeOrConditions(sanitiseTradeSlugs(trade));
  if (tradeOr) {
    query = query.or(tradeOr);
  }

  // Location bounding-box filter at the database level, refined with exact
  // distance/coverage checks below. A builder based outside the bounding box
  // still matches when their service_areas claims city/state coverage.
  if (searchCoords) {
    query = query.or(areaOrConditions(searchCoords, location));
  }

  query = query.limit(200);

  const { data, count, error } = await query;

  if (error) {
    console.warn('searchBuilders error', error.message);
    return { builders: [], total: 0, error: error.message };
  }

  let builders = (data ?? []) as unknown as BuilderWithProfile[];

  if (searchCoords && builders.length > 0) {
    builders = refineByCoverage(builders, searchCoords, searchState);
  }

  // "Verified only" filter — same definition the scorer uses (any of
  // licence / ABN / insurance verified; new-format first, legacy fallback).
  if (verified) {
    builders = builders.filter((b) => verifiedCredentialFlags(b).any);
  }

  const ratingsByBuilder = await fetchRatingAggregates(builders.map((b) => b.user_id));

  // Score all builders
  const scoreCtx: ScoreContext = {
    searchCoords,
    searchState,
    urgency,
    keywords,
    trade,
    specialisations,
    now: Date.now(),
  };
  const scored: BuilderSearchResult[] = builders.map((b) => {
    const ratingAgg = ratingsByBuilder.get(b.user_id) ?? null;
    return {
      ...b,
      _match: scoreBuilder(b, scoreCtx, ratingAgg),
      _distanceKm:
        searchCoords && b.latitude != null && b.longitude != null
          ? distanceKm(searchCoords.latitude, searchCoords.longitude, b.latitude, b.longitude)
          : null,
      _rating: ratingAgg,
    };
  });

  sortSearchResults(scored, sort, searchCoords !== null);

  // Paginate
  const total = scored.length;
  const from = (page - 1) * PAGE_SIZE;
  const paginated = scored.slice(from, from + PAGE_SIZE);

  // Website: recordSearchAppearancesSafe(paginated.map((b) => b.user_id)) runs
  // here in after() — server-only, see the module header.

  const jsFiltered = searchCoords !== null || verified === true;
  return { builders: paginated, total: resolveSearchTotal(jsFiltered, total, count) };
}

/**
 * Cheap head-only count of searchable builders who could plausibly cover a
 * location for a trade — the supply gate behind "no tradies here yet" walls.
 *
 * Deliberately the bounding-box SUPERSET (no per-builder radius refinement):
 * 0 means genuinely no supply; >0 falls through to the full search, which
 * applies the exact filter. Returns null on any failure so callers degrade
 * to the ungated screen rather than wrongly hiding live builders.
 */
export async function countSearchableBuildersNear(filters: {
  trade?: string;
  location?: string;
}): Promise<number | null> {
  try {
    let query = applySearchableFilters(
      db.from('public_builder_profiles').select('user_id', { count: 'exact', head: true }),
    );

    // Same sanitised trade filter as searchBuilders (primary OR array).
    if (filters.trade && TRADE_SLUG_RE.test(filters.trade)) {
      query = query.or(`trade_category.eq.${filters.trade},trade_categories.cs.{${filters.trade}}`);
    }

    const searchCoords = filters.location ? await geocode(filters.location) : null;
    if (searchCoords) {
      query = query.or(areaOrConditions(searchCoords, filters.location));
    }

    const { count, error } = await query;
    if (error) {
      console.warn('countSearchableBuildersNear error', error.message);
      return null;
    }
    return count ?? 0;
  } catch (e) {
    console.warn('countSearchableBuildersNear failed', e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Top builders for a given trade category (trade landing cards, "similar
 * tradies"). Availability-ascending so available tradies lead.
 */
export async function getBuildersByTrade(tradeSlug: string, limit = 6): Promise<BuilderWithProfile[]> {
  const { data, error } = await applySearchableFilters(
    db.from('public_builder_profiles').select(TRADE_CARD_SELECT),
  )
    .eq('trade_category', tradeSlug)
    .order('availability', { ascending: true })
    .limit(limit);

  if (error) {
    console.warn('getBuildersByTrade error', error.message);
    return [];
  }

  return (data ?? []) as unknown as BuilderWithProfile[];
}

type UntypedRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

/**
 * Count of active builders per trade_category via the Postgres function
 * `builder_count_by_trade` (GROUP BY server-side). Not in the generated
 * Database types — cast to a minimal signature, as the website does.
 */
export async function getBuildersCountByTrade(): Promise<Record<string, number>> {
  const rpc = db.rpc as unknown as UntypedRpc;
  const { data, error } = await rpc('builder_count_by_trade');

  if (error) {
    console.warn('getBuildersCountByTrade error', error.message);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of (data as { trade_category: string; count: number }[] | null) ?? []) {
    counts[row.trade_category] = Number(row.count);
  }
  return counts;
}
