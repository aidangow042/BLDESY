// AUTO-SYNCED from ~/bldesy-web/lib/zone-priority.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Primary-before-Can-cover ordering for finite lead allocation.
 *
 * Job-alert fan-out is capped (MAX_MATCHES_PER_JOB) — there are more matching
 * tradies than slots, so the order genuinely decides who gets the lead. Before
 * the Primary / Can cover split there was no order at all: the fan-out did
 * `matched.slice(0, 50)` straight off PostgREST, and Postgres heap order is
 * unstable, so which tradies were alerted was arbitrary and could differ
 * between two identical jobs.
 *
 * Deliberately a HARD two-pass here, unlike homeowner search (which folds the
 * split into the weighted distance score in lib/builder-scoring.ts). Ordering a
 * results page is a question about relevance to the homeowner; handing out 50
 * finite lead slots is a question about who committed to the area. A tradie who
 * named a zone as Primary should always be alerted ahead of one who merely
 * accepts work there, and that promise is only worth making if it's absolute.
 *
 * Isomorphic — no server imports, so the push-side fan-out and the client-side
 * job feed can share one definition of "whose area is this really".
 */

import {
  parseServiceAreas,
  zoneCoverageKind,
  type AuState,
  type CoverageKind,
} from "@/lib/web/service-areas";
import { distanceKm } from "@/lib/geo";

/** The slice of a builder row the ordering needs. */
export interface ZonePriorityRow {
  service_areas: string[] | null;
  latitude: number | null;
  longitude: number | null;
}

export type ZonePriorityBand = CoverageKind | "radius";

/**
 * Which band a row falls in for the job's location:
 *   "primary" — a `region:` (or `state:`) claim reaches the job
 *   "cover"   — only a `cover:` claim reaches it
 *   "radius"  — no zone claim reaches it; matched on travel radius or the
 *               legacy suburb-name fallback instead
 *
 * "radius" sorts last because it carries no statement of intent about the area.
 * Note this is exactly why the zone-model migration seeds a Primary area for
 * pre-split profiles: a genuinely local tradie whose coverage was stored as
 * plain suburbs would otherwise be demoted below an out-of-area tradie who
 * ticked Can cover.
 */
export function zonePriorityBand(
  row: ZonePriorityRow,
  jobCoord: { latitude: number; longitude: number } | null,
  jobState: AuState | null,
): ZonePriorityBand {
  const coverage = parseServiceAreas(row.service_areas);
  if (jobCoord) {
    return zoneCoverageKind(coverage, jobCoord, jobState) ?? "radius";
  }
  // No geocode for the job — the state claim is the only zone signal left.
  return jobState && coverage.states.includes(jobState) ? "primary" : "radius";
}

const BAND_RANK: Record<ZonePriorityBand, number> = {
  primary: 0,
  cover: 1,
  radius: 2,
};

/**
 * Order matched tradies: every Primary match first, then Can cover, then
 * radius-only as backfill. Nearest first inside each band, so the slice that
 * follows stops being arbitrary heap order even when one band overflows the cap.
 *
 * Pure and stable — returns a new array and never mutates the input. Rows with
 * no coordinates sort last within their band (distance unknown, not zero).
 */
export function orderMatchesByZonePriority<T extends ZonePriorityRow>(
  rows: T[],
  jobCoord: { latitude: number; longitude: number } | null,
  jobState: AuState | null,
): T[] {
  const keyed = rows.map((row, index) => {
    const band = zonePriorityBand(row, jobCoord, jobState);
    const dist =
      jobCoord && row.latitude != null && row.longitude != null
        ? distanceKm(jobCoord.latitude, jobCoord.longitude, row.latitude, row.longitude)
        : Number.POSITIVE_INFINITY;
    return { row, rank: BAND_RANK[band], dist, index };
  });
  keyed.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.dist - b.dist ||
      // Final tie-break on original position keeps the sort deterministic for
      // rows that are otherwise identical (e.g. two geo-less legacy matches).
      a.index - b.index,
  );
  return keyed.map((k) => k.row);
}
