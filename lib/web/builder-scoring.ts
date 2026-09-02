// AUTO-SYNCED from ~/bldesy-web/lib/builder-scoring.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Search relevance scoring for builder results — extracted from
 * lib/queries/builders.ts so it's a pure, unit-testable module with no
 * Supabase/server imports.
 *
 * Design rules (decided 2026-07-05):
 *  - Scoring only affects RANKING; it never filters anyone out. Hard rules
 *    (trade match, in service area, verified-only) live in searchBuilders.
 *  - A component only counts toward the percent denominator when that part
 *    of the search is in play (trade searched, location given, keywords
 *    typed…), so percentages are never deflated by things the searcher
 *    didn't ask about. Always-in-play components: timing 20 + credentials
 *    10 + reputation 14.
 *  - Reputation (reviews + displayed BLDESY score) uses NEUTRAL midpoints
 *    when a builder has no data, so pre-launch builders aren't punished for
 *    a review count nobody has yet — good data lifts you, bad data drops
 *    you, no data leaves you in the middle.
 */

import { distanceKm } from "@/lib/geo";
import {
  parseServiceAreas,
  zoneCoverageKind,
  type AuState,
} from "@/lib/web/service-areas";
import { verifiedCredentialFlags } from "@/lib/web/credentials";
import type { MatchDetail, MatchScore } from "@/types";

/** Fixed proximity yardstick — see the distance section for why it is NOT
 *  the builder's own radius_km. */
export const DISTANCE_YARDSTICK_KM = 30;

/**
 * Floors applied to the 15-pt distance component when a builder's declared
 * coverage reaches the searched point but their home base is far from it.
 *
 * Primary sits above Can cover so a tradie who named the area as one they want
 * work in outranks one who merely accepts it. Both stay below the 15-pt max so
 * a genuinely local tradie still wins on proximity. Was a single flat 10 before
 * the Primary / Can cover split.
 */
export const PRIMARY_COVERAGE_FLOOR = 12;
export const COVER_COVERAGE_FLOOR = 6;

/**
 * Self-reported response-time → points. Keys must cover the CURRENT
 * edit-profile options (app/portal/edit-profile/page.tsx RESPONSE_TIMES)
 * plus every legacy value still on live rows ("Within 2 hours" predates the
 * current option list). Unknown values score 0 — add them here when a new
 * legacy value surfaces.
 */
export const RESPONSE_TIME_POINTS: Record<string, number> = {
  "Within 1 hour": 8,
  "Within 2 hours": 7, // legacy option, still on live rows
  "Within 4 hours": 6,
  "Within 24 hours": 4,
  "Within 2 days": 2,
  "Within a week": 1,
};

export interface ScoreContext {
  searchCoords: { latitude: number; longitude: number } | null;
  /**
   * State of the searched location — postcode-derived, else inferred from
   * the nearest metro. Same hint the post-fetch filter uses, so a builder
   * who passed the filter on state coverage also scores as covering it.
   */
  searchState: AuState | null;
  urgency?: string;
  keywords: string[];
  trade?: string;
  /** Specialisation slugs the searcher asked for (e.g. "colorbond-metal-roofing"). */
  specialisations: string[];
  /** Clock for next_available_date comparisons — injectable for tests. */
  now: number;
}

/** Review aggregate computed by searchBuilders from the reviews table. */
export interface RatingAggregate {
  average: number;
  count: number;
}

/**
 * The builder fields scoring reads — structural, so both the Supabase row
 * shape and test fixtures fit without casts.
 */
export interface ScorableBuilder {
  business_name?: string | null;
  bio?: string | null;
  projects?: Array<{ title?: string | null; description?: string | null }> | null;
  trade_category?: string | null;
  trade_categories?: string[] | null;
  specialisations?: Record<string, string[]> | null;
  availability?: string | null;
  response_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_areas?: string[] | null;
  /** Public only when the tradie's display mode exposes it (view-gated). */
  next_available_date?: string | null;
  /** Public only when display_bldesy_score is true (view-gated). */
  bldesy_score?: number | null;
  credentials?: unknown;
  credentials_verified?: unknown;
}

/** Days from ctx.now until a YYYY-MM-DD date; null when absent/invalid. */
function daysUntil(dateStr: string | null | undefined, now: number): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return null;
  return (t - now) / 86_400_000;
}

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Escape a keyword for literal use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scoreBuilder(
  builder: ScorableBuilder,
  ctx: ScoreContext,
  rating: RatingAggregate | null = null,
): MatchScore {
  const details: MatchDetail[] = [];
  // Points accumulate here, NOT by summing details — reputation contributes
  // neutral points without rendering a chip, and details are display-only.
  let totalPoints = 0;

  // Priority order: Trade → Keywords → Timing → Distance → Credentials → Reputation
  // Hard rule: trade match + in radius = ALWAYS shows. Scoring only affects ranking.

  // 1. Trade match (30 pts) — only in play when the search names a trade.
  //    Primary trade beats secondary. The DB filter guarantees one of the two
  //    matches; the else (15) is defensive against case/data drift and
  //    labelled honestly.
  const searchedTrades = ctx.trade?.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) ?? [];
  if (searchedTrades.length > 0) {
    const primaryMatch = searchedTrades.includes(builder.trade_category?.toLowerCase() ?? "");
    const secondaryMatch = !primaryMatch &&
      (builder.trade_categories ?? []).some((t) => searchedTrades.includes(t?.toLowerCase()));
    if (primaryMatch) {
      totalPoints += 30;
      details.push({ label: "Primary trade", matched: true, points: 30, maxPoints: 30 });
    } else if (secondaryMatch) {
      totalPoints += 20;
      details.push({ label: "Secondary trade", matched: true, points: 20, maxPoints: 30 });
    } else {
      totalPoints += 15;
      details.push({ label: "Related trade", matched: true, points: 15, maxPoints: 30 });
    }
  }

  // 2. Keywords (25 pts) — prefix-boundary match so "tile" hits "tiles" and
  //    "tiling" but not "textile". Suffix matching is deliberate: tradie
  //    vocab is plural/-ing heavy.
  if (ctx.keywords.length > 0) {
    const searchable = [
      builder.business_name ?? "",
      builder.bio ?? "",
      ...(builder.projects ?? []).map((p) => `${p?.title ?? ""} ${p?.description ?? ""}`),
    ].join(" ").toLowerCase();

    let kwTotalPoints = 0;
    const perKw = Math.round(25 / ctx.keywords.length);
    for (const kw of ctx.keywords) {
      const matched = new RegExp(`\\b${escapeRegExp(kw.toLowerCase())}`).test(searchable);
      if (matched) {
        kwTotalPoints += perKw;
        details.push({ label: `Keyword: ${kw}`, matched: true, points: perKw, maxPoints: perKw });
      }
    }
    if (kwTotalPoints === 0) {
      details.push({ label: "No keyword matches", matched: false, points: 0, maxPoints: 25 });
    }
    totalPoints += Math.min(25, kwTotalPoints);
  }

  // 2.5 Specialisation match (20 pts) — soft boost only, NEVER a filter.
  //     A roofer who ticked the requested sub-trade (e.g. Colorbond) outranks
  //     a roofer who didn't; the non-matching roofer still shows, just lower.
  //     Scaled by how many of the requested specialities the builder offers.
  const SPEC_POINTS = 20;
  if (ctx.specialisations.length > 0) {
    const builderSpecs = builder.specialisations;
    const offered = new Set<string>();
    if (builderSpecs) {
      // Scope to the searched trade(s); if no trade was searched, weigh every
      // specialisation the builder lists.
      const scope = searchedTrades.length > 0 ? searchedTrades : Object.keys(builderSpecs);
      for (const t of scope) for (const s of builderSpecs[t] ?? []) offered.add(s);
    }
    const matchedSpecs = ctx.specialisations.filter((s) => offered.has(s));
    const specPoints = Math.round((SPEC_POINTS * matchedSpecs.length) / ctx.specialisations.length);
    totalPoints += specPoints;
    details.push({
      label:
        matchedSpecs.length === 0
          ? "No speciality match"
          : matchedSpecs.length === ctx.specialisations.length
            ? "Specialist match"
            : `Specialist match (${matchedSpecs.length}/${ctx.specialisations.length})`,
      matched: matchedSpecs.length > 0,
      points: specPoints,
      maxPoints: SPEC_POINTS,
    });
  }

  // 3. Timing — availability + response time (20 pts)
  // 3a. Availability (12 pts). next_available_date (public only in
  //     next_available/calendar display modes) softens hard "unavailable":
  //     a tradie free in a few days is a better ASAP answer than one with
  //     no return date at all.
  let availPoints = 0;
  let availLabel = "Availability unknown";
  const urg = ctx.urgency;
  const availableInDays = daysUntil(builder.next_available_date, ctx.now);
  const backSoonLabel = builder.next_available_date
    ? `Available from ${shortDate(builder.next_available_date)}`
    : "Availability unknown";
  if (!urg || urg === "any" || urg === "flexible") {
    if (builder.availability === "available") { availPoints = 12; availLabel = "Available now"; }
    else if (builder.availability === "limited") { availPoints = 8; availLabel = "Limited availability"; }
    else if (availableInDays != null && availableInDays <= 14) { availPoints = 5; availLabel = backSoonLabel; }
    else { availPoints = 2; availLabel = "Currently unavailable"; }
  } else if (urg === "asap") {
    if (builder.availability === "available") { availPoints = 12; availLabel = "Available now"; }
    else if (availableInDays != null && availableInDays <= 3) { availPoints = 9; availLabel = backSoonLabel; }
    else if (builder.availability === "limited") { availPoints = 4; availLabel = "Limited availability"; }
  } else if (urg === "this_week") {
    if (builder.availability === "available") { availPoints = 12; availLabel = "Available now"; }
    else if (builder.availability === "limited") { availPoints = 8; availLabel = "Available this week"; }
    else if (availableInDays != null && availableInDays <= 7) { availPoints = 8; availLabel = backSoonLabel; }
  }
  totalPoints += availPoints;
  details.push({ label: availLabel, matched: availPoints >= 8, points: availPoints, maxPoints: 12 });

  // 3b. Response time (8 pts)
  const rtPoints = RESPONSE_TIME_POINTS[builder.response_time ?? ""] ?? 0;
  totalPoints += rtPoints;
  if (rtPoints > 0) {
    details.push({
      label: `Typically responds ${(builder.response_time ?? "").toLowerCase()}`,
      matched: true, points: rtPoints, maxPoints: 8,
    });
  }

  // 4. Distance proximity (15 pts) — only in play when the search has a
  //    location. Continuous linear scale against a FIXED 30km yardstick:
  //    15 pts at 0km falling to 0 at 30km+. Deliberately NOT normalised by
  //    the builder's own radius_km — that rewarded declaring a huge radius
  //    (same distance, more points) and penalised genuinely local tradies.
  //    Willingness to travel is the filter's job + the coverage bump below;
  //    these points measure closeness only.
  if (ctx.searchCoords) {
    let locationPoints = 3; // fallback for coverage-matched builders without coords
    let locationLabel = "In service area";

    if (builder.latitude != null && builder.longitude != null) {
      const dist = distanceKm(
        ctx.searchCoords.latitude, ctx.searchCoords.longitude,
        builder.latitude, builder.longitude,
      );
      const ratio = Math.max(0, 1 - dist / DISTANCE_YARDSTICK_KM);
      locationPoints = Math.round(15 * ratio);
      locationLabel = `${Math.round(dist)}km away`;
    }
    // Region/state coverage: a builder whose declared coverage includes the
    // searched point ranks as servicing the area even when their home base is
    // far away (e.g. Sydney HQ covering all of QLD). Uses the same state hint
    // as the post-fetch filter so the two can't disagree.
    //
    // The floor differs by kind, which is how Primary outranks Can cover here.
    // Deliberately a floor on the existing 15-pt factor rather than a hard
    // "all Primary before any Can cover" block: search is a weighted score
    // everywhere else, and a block would put an unrated Primary tradie 20km
    // away above a 5-star verified Can-cover tradie 2km away — worse for the
    // homeowner. Job-alert fan-out DOES use a hard Primary-first pass, because
    // allocating 50 finite lead slots is a different question from ordering a
    // results page (see orderMatchesByZonePriority).
    //
    // Legacy `region:<City>` and `state:` claims resolve as "primary": they're
    // the tradie's existing commitment, so old rows upgrade with no backfill.
    // Within ~12km the raw distance ramp already beats both floors, so a
    // Primary/Can-cover pair standing next to each other ties — correct, since
    // at that range closeness is the honest signal.
    if (locationPoints < PRIMARY_COVERAGE_FLOOR) {
      const coverage = parseServiceAreas(builder.service_areas);
      const kind = zoneCoverageKind(coverage, ctx.searchCoords, ctx.searchState);
      if (kind === "primary") {
        locationPoints = PRIMARY_COVERAGE_FLOOR;
        locationLabel = "Your primary area";
      } else if (kind === "cover" && locationPoints < COVER_COVERAGE_FLOOR) {
        locationPoints = COVER_COVERAGE_FLOOR;
        locationLabel = "Covers your area";
      }
    }
    totalPoints += locationPoints;
    details.push({ label: locationLabel, matched: locationPoints > 0, points: locationPoints, maxPoints: 15 });
  }

  // 5. Credentials (10 pts) — shared definition with the "Verified only"
  //    filter and the card badge (lib/credentials.ts).
  const flags = verifiedCredentialFlags(builder);
  let credPoints = 0;
  const credLabels: string[] = [];
  if (flags.licence) { credPoints += 4; credLabels.push("Licensed"); }
  if (flags.abn) { credPoints += 3; credLabels.push("ABN"); }
  if (flags.insurance) { credPoints += 3; credLabels.push("Insured"); }
  totalPoints += credPoints;
  details.push({
    label: credLabels.length > 0 ? `Verified (${credLabels.join(", ")})` : "Not yet verified",
    matched: credPoints > 0,
    points: credPoints,
    maxPoints: 10,
  });

  // 6. Reputation (14 pts, neutral 7) — the platform's own quality signals.
  // 6a. Reviews (8 pts, neutral 4): average pulls up or down from the
  //     midpoint, confidence-scaled so one 5★ review (~5 pts) can't outrank
  //     twenty 4.8★ ones (8 pts). Full confidence at 5+ reviews.
  let ratingPoints = 4;
  if (rating && rating.count > 0) {
    const confidence = Math.min(1, rating.count / 5);
    ratingPoints = Math.round(4 + ((rating.average - 3) / 2) * 4 * confidence);
    ratingPoints = Math.max(0, Math.min(8, ratingPoints));
    details.push({
      label: `★ ${rating.average.toFixed(1)} (${rating.count} review${rating.count === 1 ? "" : "s"})`,
      matched: ratingPoints > 4,
      points: ratingPoints,
      maxPoints: 8,
    });
  }
  totalPoints += ratingPoints;

  // 6b. BLDESY Score (6 pts, neutral 3): only sees the score when the tradie
  //     displays it (the public view nulls hidden scores), so ranking can
  //     never leak a hidden score. Displaying a strong score beats hiding it;
  //     displaying a weak one scores below neutral — that asymmetry is the
  //     incentive, not a bug.
  let bldesyPoints = 3;
  if (builder.bldesy_score != null) {
    bldesyPoints = Math.round((6 * builder.bldesy_score) / 100);
    details.push({
      label: `BLDESY Score ${builder.bldesy_score}`,
      matched: bldesyPoints > 3,
      points: bldesyPoints,
      maxPoints: 6,
    });
  }
  totalPoints += bldesyPoints;

  // Percentage — base 44 is the always-in-play components (timing 20 +
  // credentials 10 + reputation 14); trade adds 30, distance 15, keywords 25,
  // specialities 20, each only when that part of the search is in play.
  const maxPossible =
    44 +
    (searchedTrades.length > 0 ? 30 : 0) +
    (ctx.searchCoords ? 15 : 0) +
    (ctx.keywords.length > 0 ? 25 : 0) +
    (ctx.specialisations.length > 0 ? 20 : 0);
  const percent = Math.round((totalPoints / maxPossible) * 100);

  return {
    percent: Math.max(10, Math.min(99, percent)),
    details: details.filter((d) => d.matched),
  };
}
