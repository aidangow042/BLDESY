// AUTO-SYNCED from ~/bldesy-web/lib/match.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Match a tradie's capabilities against a job's required_capabilities.
 *
 * Used in three places:
 *   - The job detail screen: tells the viewing tradie which required items
 *     they're missing (warning banner above the Apply button).
 *   - The enterprise applicant review: scores + ranks applicants.
 *   - The builder feed: small green/yellow pill on each Project Job card.
 *
 * Pure function, no IO. Safe to call on both server and client.
 */

import {
  ALL_CAPABILITY_KEYS,
  CAPABILITY_LABELS,
  hasCapability,
  type CapabilityKey,
  type RequiredCapabilities,
  type TradieCapabilities,
} from "@/lib/web/capabilities";

export interface MatchItem {
  key: CapabilityKey;
  label: string;
  /** Whether the tradie has this capability. */
  met: boolean;
}

export interface MatchResult {
  /** Required items where the tradie has the capability. */
  metRequired: MatchItem[];
  /** Required items where the tradie does NOT have the capability. */
  missingRequired: MatchItem[];
  /** Preferred items where the tradie has the capability. */
  metPreferred: MatchItem[];
  /** Preferred items where the tradie does NOT have the capability. */
  missingPreferred: MatchItem[];
  /** Convenience numbers used by badges + score display. */
  totalRequired: number;
  totalPreferred: number;
  /**
   * null = job has no min_public_liability set (no opinion)
   * true = tradie meets or exceeds min
   * false = tradie has none, or has less than the min
   */
  publicLiabilityMet: boolean | null;
  publicLiabilityRequired: number | null;
  publicLiabilityTradie: number | null;
  /** True when the job has no requirements at all (no badges to render). */
  hasNoRequirements: boolean;
}

/**
 * Score from 0 to 1 across required + preferred + public liability.
 * Required items count double, preferred count single, public liability
 * counts double when set. Returns 1 when the job has no requirements.
 */
export function matchScore(match: MatchResult): number {
  if (match.hasNoRequirements) return 1;
  let total = 0;
  let met = 0;
  total += match.totalRequired * 2;
  met += match.metRequired.length * 2;
  total += match.totalPreferred;
  met += match.metPreferred.length;
  if (match.publicLiabilityRequired != null) {
    total += 2;
    if (match.publicLiabilityMet) met += 2;
  }
  if (total === 0) return 1;
  return met / total;
}

export function computeMatch(
  tradieCaps: TradieCapabilities | null,
  jobRequirements: RequiredCapabilities | null | undefined,
  minPublicLiability: number | null | undefined,
): MatchResult {
  const reqs: RequiredCapabilities = jobRequirements ?? {};
  const metRequired: MatchItem[] = [];
  const missingRequired: MatchItem[] = [];
  const metPreferred: MatchItem[] = [];
  const missingPreferred: MatchItem[] = [];

  for (const key of ALL_CAPABILITY_KEYS) {
    const level = reqs[key];
    if (level !== "required" && level !== "preferred") continue;

    const met = hasCapability(tradieCaps, key);
    const item: MatchItem = { key, label: CAPABILITY_LABELS[key], met };
    if (level === "required") {
      (met ? metRequired : missingRequired).push(item);
    } else {
      (met ? metPreferred : missingPreferred).push(item);
    }
  }

  const tradieLiability = tradieCaps?.public_liability_amount ?? null;
  const minLiability = minPublicLiability ?? null;
  let publicLiabilityMet: boolean | null = null;
  if (minLiability != null) {
    publicLiabilityMet = tradieLiability != null && tradieLiability >= minLiability;
  }

  const totalRequired = metRequired.length + missingRequired.length;
  const totalPreferred = metPreferred.length + missingPreferred.length;
  const hasNoRequirements =
    totalRequired === 0 && totalPreferred === 0 && minLiability == null;

  return {
    metRequired,
    missingRequired,
    metPreferred,
    missingPreferred,
    totalRequired,
    totalPreferred,
    publicLiabilityMet,
    publicLiabilityRequired: minLiability,
    publicLiabilityTradie: tradieLiability,
    hasNoRequirements,
  };
}

/**
 * Three-state colour bucket used by the applicant-list badge.
 * - green: all required + public-liability met
 * - amber: at least one required item met but some still missing
 * - red: nothing required met
 */
export type MatchTier = "full" | "partial" | "none";

export function matchTier(match: MatchResult): MatchTier {
  if (match.hasNoRequirements) return "full";
  const liabilityFails = match.publicLiabilityRequired != null && !match.publicLiabilityMet;
  if (match.missingRequired.length === 0 && !liabilityFails) return "full";
  if (match.metRequired.length === 0 && liabilityFails) return "none";
  if (match.metRequired.length === 0 && match.totalRequired > 0) return "none";
  return "partial";
}

/**
 * Headline string for the applicant card badge.
 * e.g. "8/10 requirements met" or "All requirements met".
 */
export function matchHeadline(match: MatchResult): string {
  if (match.hasNoRequirements) return "No specific requirements";

  const denominators = [
    match.totalRequired,
    match.totalPreferred,
    match.publicLiabilityRequired != null ? 1 : 0,
  ];
  const numerators = [
    match.metRequired.length,
    match.metPreferred.length,
    match.publicLiabilityMet ? 1 : 0,
  ];
  const denom = denominators.reduce((a, b) => a + b, 0);
  const num = numerators.reduce((a, b) => a + b, 0);
  if (denom === num) return "All requirements met";
  return `${num}/${denom} requirements met`;
}
