/**
 * Pure logic behind the /for-homeowners coverage explorer — the search index,
 * matcher, zone/geometry joins and label anchors of the website's
 * components/coverage/coverage-search.tsx + coverage-map.tsx, lifted out so the
 * RN components stay presentational and node tests can cover the rules
 * (__tests__/marketing/coverage-logic.test.ts).
 */
import { COVERAGE_ZONES, SEARCH_ALIASES, zoneForSuburb, type CoverageZone } from '@/lib/web/coverage-map/config';

import { RING_LABELS, SUBURB_GEO } from './geo';

export interface SearchEntry {
  label: string;
  geoName: string;
  zoneSlug: string | null;
  zoneName: string | null;
}

/** Non-residential geometry that shouldn't come up as "your suburb". */
export const EXCLUDE_RING: ReadonlySet<string> = new Set([
  'Botany Bay',
  'Rookwood',
  'Port Botany',
  'Clyde',
  'Sydney Olympic Park',
  'Kurnell',
]);

/**
 * The instant local list: every launch-zone suburb (drawn or not), the alias
 * names people actually type, and the greyed context suburbs around the zones.
 * Anything else falls through to the national suburb dataset and resolves as
 * "not covered".
 */
export const LOCAL_ENTRIES: readonly SearchEntry[] = (() => {
  const entries: SearchEntry[] = [];
  const seen = new Set<string>();
  for (const zone of COVERAGE_ZONES) {
    for (const s of zone.suburbs) {
      entries.push({
        label: s,
        // Aliased names without their own boundary pin their real locality.
        geoName: SUBURB_GEO[s] ? s : (SEARCH_ALIASES[s] ?? s),
        zoneSlug: zone.slug,
        zoneName: zone.name,
      });
      seen.add(s.toLowerCase());
    }
  }
  for (const [alias, real] of Object.entries(SEARCH_ALIASES)) {
    if (seen.has(alias.toLowerCase())) continue;
    const zone = zoneForSuburb(real);
    if (!zone) continue;
    entries.push({ label: alias, geoName: real, zoneSlug: zone.slug, zoneName: zone.name });
    seen.add(alias.toLowerCase());
  }
  for (const name of Object.keys(SUBURB_GEO)) {
    if (seen.has(name.toLowerCase()) || EXCLUDE_RING.has(name)) continue;
    entries.push({ label: name, geoName: name, zoneSlug: null, zoneName: null });
    seen.add(name.toLowerCase());
  }
  return entries.sort((a, b) => a.label.localeCompare(b.label));
})();

export const MAX_MATCHES = 8;

/** Prefix matches first, then substring matches; empty below two characters. */
export function localMatches(query: string, limit = MAX_MATCHES): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = LOCAL_ENTRIES.filter((e) => e.label.toLowerCase().startsWith(q));
  const within = LOCAL_ENTRIES.filter(
    (e) => !e.label.toLowerCase().startsWith(q) && e.label.toLowerCase().includes(q),
  );
  return starts.concat(within).slice(0, limit);
}

/**
 * Top the local matches up with national suggestions (any Australian suburb
 * resolves — to "not covered" — instead of dead-ending). Bare postcodes and
 * duplicates are dropped.
 */
export function mergeNationalMatches(local: SearchEntry[], national: string[], limit = MAX_MATCHES): SearchEntry[] {
  const have = new Set(local.map((e) => e.label.toLowerCase()));
  const extra: SearchEntry[] = [];
  for (const name of national) {
    if (have.has(name.toLowerCase()) || /^\d+$/.test(name)) continue;
    const zone = zoneForSuburb(name);
    extra.push({
      label: name,
      geoName: name,
      zoneSlug: zone?.slug ?? null,
      zoneName: zone?.name ?? null,
    });
    have.add(name.toLowerCase());
  }
  return local.concat(extra).slice(0, limit);
}

/* ── Map joins ─────────────────────────────────────────────────────── */

export const zoneBySlug: ReadonlyMap<string, CoverageZone> = new Map(COVERAGE_ZONES.map((z) => [z.slug, z]));

/** slug → geometry-backed member suburbs */
export const zoneGeoMembers: ReadonlyMap<string, string[]> = new Map(
  COVERAGE_ZONES.map((z) => [z.slug, z.suburbs.filter((s) => SUBURB_GEO[s])]),
);

const memberNames = new Set(COVERAGE_ZONES.flatMap((z) => z.suburbs));

/** Greyed context ring: every drawn suburb that isn't in a launch zone. */
export const ringNames: readonly string[] = Object.keys(SUBURB_GEO).filter((n) => !memberNames.has(n));

/** Context labels — filtered so a label never sits on a zone fill. */
export const ringLabelNames: readonly string[] = RING_LABELS.filter((n) => SUBURB_GEO[n] && !memberNames.has(n));

/** Area-weighted label anchor for a zone (+ its configured nudge). */
export function zoneLabelAnchor(zone: CoverageZone): { x: number; y: number } {
  const pts = (zoneGeoMembers.get(zone.slug) ?? []).map((s) => SUBURB_GEO[s]);
  const area = pts.reduce((n, p) => n + p.a, 0) || 1;
  return {
    x: pts.reduce((n, p) => n + p.cx * p.a, 0) / area + zone.nudge[0],
    y: pts.reduce((n, p) => n + p.cy * p.a, 0) / area + zone.nudge[1],
  };
}

export const zoneAnchors: ReadonlyMap<string, { x: number; y: number }> = new Map(
  COVERAGE_ZONES.map((z) => [z.slug, zoneLabelAnchor(z)]),
);

/**
 * The website's `--color-map-*` tokens (app/globals.css), light and dark.
 * Zone fills come from lib/web/coverage-map/config and are the same in both.
 */
export const MAP_COLORS = {
  light: {
    water: '#DCE7EC',
    land: '#E7E1D6',
    waterLabel: '#7E97A3',
    zoneMuted: '#D9D4C4',
    zoneBoundary: '#FFFFFF',
  },
  dark: {
    water: '#10191F',
    land: '#2A2721',
    waterLabel: '#56707E',
    zoneMuted: '#35332B',
    zoneBoundary: '#10191F',
  },
} as const;

/** The legend swatch for "Founding neighbourhood" — the web hardcodes the mid green step. */
export const LEGEND_FOUNDING_FILL = '#00745F';

/** Zones dim (swap to the muted fill) when another zone is active, or in outside mode. */
export function isZoneDimmed(slug: string, activeZone: string | null, outsideMode: boolean): boolean {
  return activeZone ? activeZone !== slug : outsideMode;
}
