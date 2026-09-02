// AUTO-SYNCED from ~/bldesy-web/lib/suburbs.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import auLocations from "@/lib/au-locations.json";
import { MAJOR_LOCATIONS } from "@/lib/web/locations";
import { slugify } from "@/lib/web/slug";
import { distanceKm, getPostcodeForSuburb } from "@/lib/geo";
import {
  FOUNDING_SUBURB_NAMES,
  getCityRegion,
  stateForPostcode,
  type AuState,
} from "@/lib/web/service-areas";

/**
 * Suburb URL segments — the slug↔locality layer for /{plural}/{suburb} pages.
 *
 * Reverse-mapping a slug is NOT "replace hyphens with spaces": the dataset
 * has keys like "o'connor", "brighton-le-sands" and "no. 4 branch", plus a
 * few dozen distinct keys that slugify identically. So the mapping is a
 * precomputed Map over every au-locations.json locality (first key wins on
 * a slug collision — colliders are spelling variants of the same place),
 * overlaid with MAJOR_LOCATIONS (curated names/states win, and they cover
 * cities the JSON lacks, e.g. Central Coast / Gold Coast / Sunshine Coast).
 */
export interface SuburbEntry {
  /** Verbatim au-locations.json key (lowercase) — what geocode()/search accept as `location`. */
  key: string;
  /** Display name: curated for major cities, title-cased otherwise. */
  name: string;
  slug: string;
  /** Known upfront only for major cities; use stateForSuburb() elsewhere. */
  state: AuState | null;
  coords: [number, number] | null;
  isMajorCity: boolean;
}

const { l: localities } = auLocations as unknown as {
  l: Record<string, [number, number]>;
  p: Record<string, [number, number]>;
};

/** "mount kuring-gai" → "Mount Kuring-Gai", "o’connor" → "O’Connor" (dataset uses curly apostrophes). */
export function displaySuburbName(key: string): string {
  return key.replace(/(^|[\s\-'’])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());
}

/**
 * Canonical spelling and casing for a suburb someone typed into a form.
 *
 * The waitlist stores whatever was typed. Its autocomplete title-cases the
 * suggestions, but picking one is optional, so "Russell lea" and "Russell Lea"
 * both ended up in the same column — and `{suburb}` renders straight into a
 * broadcast subject line, where the difference is visible to a real person.
 *
 * Two passes, in this order:
 *
 *  1. FOUNDING_SUBURB_NAMES, matched case-insensitively. Hand-written, so they
 *     carry casing no rule can derive — "McMahons Point" is the one that
 *     proves it. Postgres `initcap()` and any plain title-caser flatten it.
 *  2. Otherwise lower-case and run displaySuburbName, which uppercases only
 *     the first letter after a separator and so gets "brighton-le-sands" and
 *     "o'connor" right without mangling the rest.
 *
 * Pass 2 is deliberately LOSSY on intercaps: a "mcmahons point" outside the
 * founding list becomes "Mcmahons Point", and so does "McMahons Point". That
 * is the accepted trade — collapsing every variant to ONE spelling is the
 * whole point, and preserving arbitrary user casing would defeat it. The
 * launch zones, which pass 1 covers exactly, are where `{suburb}` is read.
 *
 * Returns null for empty/absent input, matching the nullable column.
 */
export function canonicaliseSuburb(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  // Collapse internal runs of whitespace too — "Russell  Lea" is the same place.
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return FOUNDING_SUBURB_NAMES.get(lower) ?? displaySuburbName(lower);
}

// Built lazily: slugifying 16k keys on module load would tax every cold
// start that merely imports a helper from here.
let bySlug: Map<string, SuburbEntry> | null = null;

function getMap(): Map<string, SuburbEntry> {
  if (bySlug) return bySlug;
  const map = new Map<string, SuburbEntry>();

  for (const [key, coords] of Object.entries(localities)) {
    const slug = slugify(key);
    if (!slug || map.has(slug)) continue; // first wins — colliders are variants of one place
    map.set(slug, {
      key,
      name: displaySuburbName(key),
      slug,
      state: null,
      coords,
      isMajorCity: false,
    });
  }

  for (const city of MAJOR_LOCATIONS) {
    const region = getCityRegion(city.name);
    map.set(city.slug, {
      key: city.name.toLowerCase(),
      name: city.name,
      slug: city.slug,
      state: city.state as AuState,
      coords: region
        ? [region.latitude, region.longitude]
        : (localities[city.name.toLowerCase()] ?? null),
      isMajorCity: true,
    });
  }

  bySlug = map;
  return map;
}

/** Resolve a URL suburb segment. Null = unknown suburb → 404 the page. */
export function resolveSuburbSlug(slug: string): SuburbEntry | null {
  return getMap().get(slug) ?? null;
}

/**
 * Best-effort state for a suburb: curated for cities, otherwise derived via
 * nearest postcode. O(postcodes) scan — fine at hourly ISR, not per-request.
 */
export function stateForSuburb(entry: SuburbEntry): AuState | null {
  if (entry.state) return entry.state;
  const postcode = getPostcodeForSuburb(entry.key);
  return postcode ? stateForPostcode(postcode) : null;
}

/**
 * The n nearest distinct suburbs with coordinates — the internal-link strip
 * that lets crawlers discover on-demand ISR landing pages. O(16k) distance
 * scan per call; acceptable inside an hourly-revalidated page render.
 */
export function nearbySuburbs(entry: SuburbEntry, n = 6): SuburbEntry[] {
  if (!entry.coords) return [];
  const [lat, lng] = entry.coords;
  const candidates: Array<{ e: SuburbEntry; d: number }> = [];
  for (const e of getMap().values()) {
    if (e.slug === entry.slug || !e.coords) continue;
    const d = distanceKm(lat, lng, e.coords[0], e.coords[1]);
    if (d > 0.1) candidates.push({ e, d });
  }
  candidates.sort((a, b) => a.d - b.d);
  return candidates.slice(0, n).map((c) => c.e);
}
