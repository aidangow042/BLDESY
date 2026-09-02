// AUTO-SYNCED from ~/bldesy-web/lib/launch-trades.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * THE LAUNCH SIX, and the narrow set of unstocked trades a launch trade
 * genuinely covers.
 *
 * Derived from the dashboard's v3 launch model (bldesy-dashboard
 * lib/launchTargets.ts, locked 13 Aug 2026): the three HEAVY trades whose cells
 * gate a zone, plus the three DEFERRED pre-open trades (`soft && !postOpen`).
 * That union is exactly six, and it is a script-guarded relationship rather than
 * a coincidence — `npm run check:launch-trades`, the same mechanism
 * FOUNDING_ZONES gets from check:zones. Separate deploys, no shared package, so
 * this is a hand copy WITH A MECHANISM behind it. A comment is not a mechanism.
 *
 * Note the guard direction is the OPPOSITE of check:zones: there the dashboard
 * holds the copy of bldesy-web's zones, here bldesy-web holds the copy of the
 * dashboard's trades.
 *
 * ⚠️ Kept dependency-light on purpose: lib/waitlist-mode.ts imports this, and
 * that module is in proxy.ts's import graph and is inlined into client bundles.
 * lib/trades and lib/trade-specialisations are pure data. Nothing geographic
 * belongs here — that is lib/launch-zones.ts, which must never reach the proxy.
 */
import { getTradeBySlug, type Trade } from "@/lib/web/trades";
import { TRADE_SPECIALISATIONS } from "@/lib/web/trade-specialisations";

/**
 * The six trades BLDESY launches with. Order is the model's: heavy first (these
 * are what a zone opens on), then the pre-open deferred shelf.
 */
export const LAUNCH_TRADES = [
  // Heavy — 3 cells at floor per zone is half of what opens it.
  "plumber",
  "electrician",
  "handyman",
  // Deferred, pre-open — the announcement shelf. Soft targets, never gating.
  "carpenter",
  "painter",
  "plasterer",
] as const;

export type LaunchTradeSlug = (typeof LAUNCH_TRADES)[number];

const LAUNCH_SET: ReadonlySet<string> = new Set(LAUNCH_TRADES);

export function isLaunchTrade(slug: string): slug is LaunchTradeSlug {
  return LAUNCH_SET.has(slug);
}

/** The six as full Trade records, in model order. */
export function launchTrades(): Trade[] {
  return LAUNCH_TRADES.flatMap((slug) => getTradeBySlug(slug) ?? []);
}

/**
 * THE SPONGE — an unstocked trade mapped to the launch trade that actually
 * covers it.
 *
 * Handyman alone carries general repairs, flat-pack, TV mounting, sticking doors
 * and windows, gutter cleaning, pressure washing, minor carpentry and small
 * painting. Firing "we have nobody" at someone whose job a stocked tradie does
 * today is a self-inflicted miss, so the wall checks here first.
 *
 * EVERY ENTRY MUST BE JUSTIFIED BY A NAMED SUBTRADE in TRADE_SPECIALISATIONS —
 * that is what `via` records, and __tests__/launch-trades.test.ts asserts each
 * one still exists. `partial` is the limit of the cover, and the copy must state
 * it verbatim: a handyman cleans gutters, he does not replace them.
 *
 * Deliberately short. "Handyman covers a lot" is true of small repairs and false
 * of tiling, roofing, air con, landscaping and cleaning. A map that outran its
 * evidence would be the dishonesty this whole change exists to fix.
 *
 * NOT HERE, AND WHY:
 *  · locksmith, security-systems — NSW security-licensed work (lib/nsw-security.ts
 *    exists because that licence is actually checked). "A handyman can do your
 *    locks" is a compliance claim, not a convenience.
 *  · gas-fitter — a separate NSW ticket. Plenty of plumbers hold it, but the
 *    platform cannot assert it per-tradie from a taxonomy.
 *  · wallpapering -> painter, hot-water-systems -> plumber — real-world obvious,
 *    but NEITHER has a matching subtrade in the data. Adding one would change
 *    what tradies can tag (it persists to builder_profiles.specialisations), so
 *    it is a data decision, not a copy decision. Left out until the data says so.
 *  · tiler, cleaner, landscaper, air-conditioning-hvac, roofer, fencer,
 *    concreter — nothing in the six covers these. The wall fires, correctly.
 *    These are also the expected volume drivers, which is the point: they become
 *    the recruiting signal rather than a bounced visitor.
 */
export interface Cover {
  /** The launch trade that covers it. */
  trade: LaunchTradeSlug;
  /** TRADE_SPECIALISATIONS slugs on `trade` that justify the claim. */
  via: readonly string[];
  /** null = full cover. Text = the limit, rendered verbatim in the copy. */
  partial: string | null;
}

export const COVERED_BY: Readonly<Record<string, Cover>> = {
  renderer: {
    trade: "plasterer",
    via: ["external-render", "acrylic-render", "texture-coating"],
    partial: null,
  },
  "cabinet-maker": {
    trade: "carpenter",
    via: ["cabinet-maker"],
    partial: null,
  },
  drainage: {
    trade: "plumber",
    via: ["drainage-plumber", "pipe-relining"],
    partial: null,
  },
  "data-communications": {
    trade: "electrician",
    via: ["data-communications"],
    partial: null,
  },
  flooring: {
    trade: "carpenter",
    via: ["timber-flooring"],
    partial: "timber floors — not carpet, vinyl or epoxy",
  },
  guttering: {
    trade: "handyman",
    via: ["gutter-cleaning"],
    partial: "gutter cleaning — not replacing gutters or fascia",
  },
  "antenna-tv": {
    trade: "handyman",
    via: ["tv-picture-mounting"],
    partial: "wall-mounting a TV — not installing an antenna",
  },
};

/**
 * The cover for a searched trade, if a launch trade genuinely has one.
 *
 * Callers MUST still check the covering trade is live in the zone they're
 * serving — offering a plasterer in a zone that opened with only the three heavy
 * trades is the same lie in a new costume. lib/launch-zones.ts does that.
 */
export function coverFor(tradeSlug: string | undefined): Cover | null {
  if (!tradeSlug) return null;
  return COVERED_BY[tradeSlug] ?? null;
}

/** Guard used by the tests — every `via` slug must still exist upstream. */
export function subtradeSlugsFor(trade: LaunchTradeSlug): ReadonlySet<string> {
  return new Set((TRADE_SPECIALISATIONS[trade] ?? []).map((s) => s.slug));
}
