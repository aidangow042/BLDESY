// AUTO-SYNCED from ~/bldesy-web/lib/coverage-map/config.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Presentation config for the /for-homeowners coverage map.
 *
 * Zone MEMBERSHIP is not defined here — lib/service-areas.ts FOUNDING_ZONES is
 * the single source of truth for zone → suburbs, shared with tradie
 * onboarding, supply caps and the dashboard. This module only adds what a map
 * needs on top: a colour, label placement, a few labelled dot suburbs, and
 * searchable aliases. Keyed by FOUNDING_ZONES slug; a test asserts the two
 * stay in lockstep.
 */

import { FOUNDING_ZONES, type FoundingZone } from "@/lib/web/service-areas";

export interface ZonePresentation {
  /** FOUNDING_ZONES slug — the join key */
  slug: string;
  /**
   * Fill colour. A brand green/teal ramp in three lightness steps (two hue
   * twins per step) — the map reads "covered vs not", with zone identity
   * carried by labels, hover and search rather than by hue. Adjacent zones
   * never share a step (a test enforces this). Every fill keeps white
   * zone-label contrast >= 4.5:1 — don't lighten these or the SVG labels
   * fail; the light steps (#118073 / #0A8268) sit only ~0.3 above that
   * floor. The same fills are used in dark mode where they read slightly
   * richer against the dark water.
   */
  fill: string;
  /** Zone-name label lines drawn on the map (uppercase) */
  lines: string[];
  /** Label offset from the area-weighted centroid of the zone's suburbs */
  nudge: [number, number];
  /** Small labelled suburb dots — must be zone members with geometry */
  dots: string[];
}

const PRESENTATION: Record<string, Omit<ZonePresentation, "slug">> = {
  "inner-city-cbd": {
    fill: "#00745F", // brand emerald (mid green step)
    lines: ["INNER CITY", "CBD"],
    nudge: [10, 6], // the label owns the Pyrmont/CBD mass, clear of the Balmain dot above
    dots: ["Surry Hills", "Glebe"],
  },
  "upper-eastern": {
    fill: "#064E3B", // deep emerald (dark green step)
    lines: ["UPPER EASTERN"],
    nudge: [90, -36], // up onto the Rose Bay/Vaucluse arm, clear of the Double Bay + Bondi Beach dots
    dots: ["Bondi Beach", "Paddington", "Double Bay"],
  },
  "lower-eastern-south": {
    fill: "#118073", // light teal step
    lines: ["LOWER EASTERN", "+ SOUTH"],
    nudge: [-2, 4],
    dots: ["Redfern", "Randwick", "Coogee", "Maroubra"],
  },
  "lower-inner-west": {
    fill: "#134E4A", // deep teal (dark teal step)
    lines: ["LOWER INNER WEST"],
    nudge: [0, 24],
    dots: ["Newtown", "Marrickville", "Ashfield"],
  },
  "upper-inner-west": {
    fill: "#0A8268", // light green step — matches --color-primary-dark
    lines: ["UPPER INNER WEST"],
    nudge: [-40, -45], // centroid shifted west with Strathfield/Burwood — keep label off Iron Cove
    dots: ["Balmain", "Leichhardt", "Burwood"],
  },
  "lower-north-shore": {
    fill: "#0F766E", // mid teal step
    lines: ["LOWER NORTH", "SHORE"],
    nudge: [0, 0], // Naremburn/Northbridge mass; Lane Cove dot dropped — it sat under this label
    dots: ["North Sydney", "Mosman"],
  },
  "upper-north-shore": {
    fill: "#0B5A50", // deep teal step — 1.48 lightness ratio vs its lower-north-shore land border
    lines: ["UPPER NORTH", "SHORE"],
    nudge: [-25, -45], // up onto the Killara/Lindfield mass, off the Lindfield dot
    dots: ["Chatswood", "Lindfield"],
  },
  "northern-suburbs": {
    fill: "#0A6B5B", // mid-deep green step — river-separated from every other zone
    lines: ["NORTHERN", "SUBURBS"],
    nudge: [-25, -5], // centred on the Ryde mass, off the Lane Cove West boundary
    dots: ["North Ryde", "Gladesville"], // not "Ryde" — its dot sits at the zone centre, under this label
  },
  "northern-beaches": {
    fill: "#0C8058", // light green-teal step — isolated across Middle Harbour
    lines: ["NORTHERN", "BEACHES"],
    nudge: [4, 8], // over the Balgowlah/Seaforth mass, off the tan Dee Why ring
    dots: ["Manly"],
  },
};

export interface CoverageZone extends ZonePresentation {
  name: string;
  /** Zone members for display/search — duplicates of the same locality removed */
  suburbs: string[];
}

/**
 * "Sydney" and "CBD" are both listed in FOUNDING_ZONES for the same locality
 * (the marketing count needs both searchable); showing both in a suburb list
 * reads as padding. "CBD" stays searchable via SEARCH_ALIASES below.
 */
const DISPLAY_SUPPRESSED = new Set(["CBD"]);

/** The launch zones with presentation merged in, in FOUNDING_ZONES order. */
export const COVERAGE_ZONES: CoverageZone[] = FOUNDING_ZONES.map((z: FoundingZone) => {
  const p = PRESENTATION[z.slug];
  if (!p) throw new Error(`coverage-map config missing zone "${z.slug}"`);
  const seen = new Set<string>();
  return {
    slug: z.slug,
    name: z.name,
    suburbs: z.suburbs.filter((s) => {
      const key = s.toLowerCase();
      if (seen.has(key) || DISPLAY_SUPPRESSED.has(s)) return false;
      seen.add(key);
      return true;
    }),
    ...p,
  };
});

/** Alternate names people actually type → the FOUNDING_ZONES suburb they mean. */
export const SEARCH_ALIASES: Record<string, string> = {
  CBD: "Sydney",
  "Sydney CBD": "Sydney",
  "Green Square": "Zetland",
  "Kings Cross": "Potts Point",
};

const suburbToZone = new Map<string, CoverageZone>();
for (const z of COVERAGE_ZONES) {
  for (const s of z.suburbs) suburbToZone.set(s.toLowerCase(), z);
}
// Suppressed display names and aliases still resolve to their zone.
suburbToZone.set("cbd", suburbToZone.get("sydney")!);
for (const [alias, real] of Object.entries(SEARCH_ALIASES)) {
  const zone = suburbToZone.get(real.toLowerCase());
  if (zone) suburbToZone.set(alias.toLowerCase(), zone);
}

/** Covered lookup — case-insensitive, aliases included. */
export function zoneForSuburb(name: string): CoverageZone | null {
  return suburbToZone.get(name.trim().toLowerCase()) ?? null;
}
