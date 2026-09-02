// AUTO-SYNCED from ~/bldesy-web/lib/launch-zones.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * WHICH ZONES ARE OPEN, AND WITH WHICH TRADES — the record of a deliberate
 * decision, not a computation.
 *
 * A zone opens when the dashboard's launch model says it can (ZoneCoverage.ready:
 * three heavy cells at floor AND the demand bar — 40 waitlist signups and 10
 * named jobs in that zone) and Aidan decides to open it. This file records that
 * he did. It is deliberately NOT derived from Supabase:
 *
 *  · The web can compute the SUPPLY half (lib/supply-caps.ts tallyPrimary) but
 *    has no access to the DEMAND half at all — no waitlist tally, no
 *    named-jobs-per-zone read in its query layer. Shipping half a gate under the
 *    name "open" is exactly the failure the dashboard's founding-zones mirror
 *    check exists to prevent.
 *  · Live derivation would flip site copy, internal links and robots/sitemap
 *    directives the moment a fourth plumber ticks a box at 11pm — and flip them
 *    back when one pauses their account (the spots query filters
 *    accepting_enquiries). app/robots.ts and app/sitemap.ts are ISR'd; they must
 *    not gain and lose URLs between two crawls with no deploy in between.
 *    WAITLIST_MODE is a build-time constant for the same reason.
 *  · There are already three disagreeing definitions of "supply" in this repo
 *    (countSearchableBuildersNear's geocoded radius, tallyPrimary's region:
 *    claims, and the dashboard's primaryByTrade). Making one of them the arbiter
 *    of site-wide indexability multiplies the disagreement. A config makes the
 *    HUMAN the arbiter and the dashboard the instrument.
 *
 * EMPTY MEANS NOTHING IS OPEN, and every helper here is inert — the whole module
 * returns { state: "prelaunch" } for every input, which is today's behaviour
 * unchanged. Opening the Lower Inner West with five trades is one line:
 *
 *   "lower-inner-west": ["plumber", "electrician", "handyman", "carpenter", "painter"],
 *
 * ⚠️ Do that and __tests__/launch-zones.test.ts fails on purpose (it asserts the
 * config is empty), so the flip has to go through review rather than riding along
 * in an unrelated commit. Delete that assertion deliberately. Runbook:
 * WAITLIST_MODE.md.
 *
 * Keys are FOUNDING_ZONES slugs; values must be LAUNCH_TRADES members. Both are
 * test-enforced.
 *
 * ⚠️ This module pulls in lib/coverage-map/config (→ lib/service-areas: 179
 * suburbs and 39 city regions). It must NEVER be imported by proxy.ts or a client
 * bundle. It doesn't need to be: it only answers questions INSIDE an open zone,
 * where the site-surface gate is already off. Anything the proxy needs belongs in
 * lib/launch-trades.ts, which is dependency-light.
 */
import { zoneForSuburb, type CoverageZone } from "@/lib/web/coverage-map/config";
import { canonicaliseSuburb } from "@/lib/web/suburbs";
import { getTradeBySlug, type Trade } from "@/lib/web/trades";
import { COVERED_BY, type LaunchTradeSlug } from "@/lib/web/launch-trades";

export type OpenZoneTrades = Readonly<Record<string, readonly LaunchTradeSlug[]>>;

export const OPEN_ZONE_TRADES: OpenZoneTrades = {};

/** What the wall needs to know about a trade + suburb. One question, one answer. */
export type SupplyContext =
  /** No open zone here. Pre-launch copy — today's world for every suburb. */
  | { state: "prelaunch" }
  /** Zone open AND this trade stocked in it — the wall should not be rendering. */
  | { state: "stocked"; zone: CoverageZone }
  /** Zone open, this trade is not. The post-open wall. */
  | {
      state: "unstocked";
      zone: CoverageZone;
      /** Trades that ARE live in this zone, in LAUNCH_TRADES order. */
      liveTrades: Trade[];
      /** A live trade that genuinely covers this job, if one does. */
      covered: { trade: Trade; partial: string | null } | null;
    };

/**
 * Pure core with the open-zone map injected, so open-world behaviour is
 * unit-testable while the real config stays empty. Same idiom as
 * isZoneGatedCore / zoneIsLiveCore in lib/waitlist-mode.ts.
 *
 * `suburbName` may be a display name or free text from a search box; it is
 * canonicalised before lookup, which is the same key space zoneForSuburb indexes
 * (and it handles the McMahons Point / CBD cases). A postcode won't resolve, and
 * that yields "prelaunch" — i.e. today's copy. Failure is conservative by
 * construction: we never claim a zone is open when we can't tell.
 */
export function supplyContextCore(
  open: OpenZoneTrades,
  tradeSlug: string | undefined,
  suburbName: string | undefined,
): SupplyContext {
  const canonical = canonicaliseSuburb(suburbName);
  if (!canonical) return { state: "prelaunch" };

  const zone = zoneForSuburb(canonical);
  if (!zone) return { state: "prelaunch" };

  const live = open[zone.slug];
  if (!live || live.length === 0) return { state: "prelaunch" };

  if (tradeSlug && (live as readonly string[]).includes(tradeSlug)) {
    return { state: "stocked", zone };
  }

  const liveTrades = live.flatMap((slug) => getTradeBySlug(slug) ?? []);

  // The cover must be live IN THIS ZONE. COVERED_BY.renderer points at plasterer,
  // but offering a plasterer in a zone that opened with only the three heavy
  // trades is the same lie in a new costume.
  const cover = tradeSlug ? COVERED_BY[tradeSlug] : undefined;
  const coverTrade =
    cover && (live as readonly string[]).includes(cover.trade)
      ? getTradeBySlug(cover.trade)
      : undefined;

  return {
    state: "unstocked",
    zone,
    liveTrades,
    covered: cover && coverTrade ? { trade: coverTrade, partial: cover.partial } : null,
  };
}

export function supplyContextFor(
  tradeSlug: string | undefined,
  suburbName: string | undefined,
): SupplyContext {
  return supplyContextCore(OPEN_ZONE_TRADES, tradeSlug, suburbName);
}
