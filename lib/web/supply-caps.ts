// AUTO-SYNCED from ~/bldesy-web/lib/supply-caps.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Per-trade, per-area supply caps — the launch scarcity mechanic.
 *
 * BLDESY deliberately caps how many tradies can join per trade in each
 * founding zone, so every member gets real work and the marketplace never
 * looks dead. "Spots remaining" = cap − live searchable tradies occupying
 * that trade × zone (see lib/queries/supply-spots.ts for the live count).
 *
 * Occupancy counts PRIMARY areas only (tallyPrimary). Can Cover zones are
 * reach, not density — they never consume a spot. The cap is a SOFT flag:
 * nothing blocks a tradie from picking a Primary zone that is already at or
 * over cap, and the tradie is never warned about it. It surfaces on the ops
 * dashboard for manual management only.
 *
 * Pure config, client-safe on purpose: the cap numbers appear in marketing
 * copy ("10 spots per trade, per area") as well as in server counts. Tuning
 * capacity = editing this file. Distinct from the founding-tradie offer
 * (first 200 lock launch rates) — that's a separate layered incentive.
 */

import {
  FOUNDING_ZONES,
  parseServiceAreas,
  type FoundingZone,
} from "@/lib/web/service-areas";

/** Default spots per trade in each founding zone. */
export const DEFAULT_ZONE_CAP = 10;

/**
 * Per-trade overrides (trade slug → cap) for trades where the default is
 * wrong — e.g. broad trades that can sustain more members, or specialist
 * trades where even 10 would flood the zone.
 */
export const TRADE_CAP_OVERRIDES: Record<string, number> = {};

export function capForTrade(tradeSlug: string): number {
  return TRADE_CAP_OVERRIDES[tradeSlug] ?? DEFAULT_ZONE_CAP;
}

/** Live spot availability for one trade in one founding zone. */
export interface ZoneSpots {
  zoneSlug: string;
  zoneName: string;
  cap: number;
  taken: number;
  /** Never negative, even if supply somehow exceeds the cap. */
  remaining: number;
}

/* ── Pure occupancy computation (unit-tested; fed by
      lib/queries/supply-spots.ts with live view rows) ──────────────── */

/** The slice of public_builder_profiles the occupancy tally reads. */
export interface SupplyRow {
  trade_category: string | null;
  trade_categories: string[] | null;
  service_areas: string[] | null;
}

const ZONE_NAMES_LOWER = new Map<string, FoundingZone>(
  FOUNDING_ZONES.map((z) => [z.name.toLowerCase(), z]),
);

function zonesFromNames(names: string[]): FoundingZone[] {
  const hit = new Set<FoundingZone>();
  for (const name of names) {
    const zone = ZONE_NAMES_LOWER.get(name.trim().toLowerCase());
    if (zone) hit.add(zone);
  }
  return [...hit];
}

/**
 * The founding zones a profile claims as PRIMARY — `region:<Zone Name>`
 * entries only (case-insensitive; legacy rows vary in casing).
 *
 * Deliberately does NOT infer a zone from plain-suburb entries the way the
 * pre-split `zonesCovered` did. A tradie's base suburb is the scalar
 * builder_profiles.suburb column and is not a coverage claim, so it must not
 * silently consume a ceiling spot. Primary areas are an explicit choice made
 * in the picker — nothing else.
 */
export function primaryZonesCovered(
  serviceAreas: string[] | null | undefined,
): FoundingZone[] {
  return zonesFromNames(parseServiceAreas(serviceAreas).regions);
}

/** The founding zones a profile claims as CAN COVER — `cover:` entries only. */
export function coverZonesCovered(
  serviceAreas: string[] | null | undefined,
): FoundingZone[] {
  return zonesFromNames(parseServiceAreas(serviceAreas).coverRegions);
}

function tallyBy(
  rows: SupplyRow[],
  zonesFor: (areas: string[] | null | undefined) => FoundingZone[],
): Map<string, Map<string, number>> {
  const taken = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const trades = new Set(
      [row.trade_category, ...(row.trade_categories ?? [])].filter(
        (t): t is string => !!t,
      ),
    );
    if (trades.size === 0) continue;
    const zones = zonesFor(row.service_areas);
    for (const trade of trades) {
      for (const zone of zones) {
        const perZone = taken.get(trade) ?? new Map<string, number>();
        perZone.set(zone.slug, (perZone.get(zone.slug) ?? 0) + 1);
        taken.set(trade, perZone);
      }
    }
  }
  return taken;
}

/**
 * trade slug → zone slug → PRIMARY count. A tradie counts once per trade in
 * their primary + additional trades, per zone they list as a Primary area.
 *
 * This is the ceiling tally: Can Cover never occupies a spot, which is the
 * whole point of the split — a tradie can be reachable in several zones while only
 * competing for density in the ones they actually want.
 */
export function tallyPrimary(rows: SupplyRow[]): Map<string, Map<string, number>> {
  return tallyBy(rows, primaryZonesCovered);
}

/**
 * trade slug → zone slug → CAN COVER count. Never counted against a ceiling;
 * surfaced on the ops dashboard so reach and density read as separate numbers.
 */
export function tallyCover(rows: SupplyRow[]): Map<string, Map<string, number>> {
  return tallyBy(rows, coverZonesCovered);
}

/** Per-zone availability for one trade from a pre-computed tally. */
export function spotsFromTally(
  taken: Map<string, Map<string, number>>,
  tradeSlug: string,
): ZoneSpots[] {
  const cap = capForTrade(tradeSlug);
  const perZone = taken.get(tradeSlug);
  return FOUNDING_ZONES.map((zone) => {
    const zoneTaken = perZone?.get(zone.slug) ?? 0;
    return {
      zoneSlug: zone.slug,
      zoneName: zone.name,
      cap,
      taken: zoneTaken,
      remaining: Math.max(0, cap - zoneTaken),
    };
  });
}
