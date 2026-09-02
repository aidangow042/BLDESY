/**
 * Pure map logic — trade/specialty matching, chip counts, the smart-search
 * index and ranking, cluster sizing and the empty-state headline, lifted
 * verbatim from ~/bldesy-web/components/map/{map-view,map-filter-bar,
 * smart-search,map-empty-state,builder-marker}.tsx so the RN screen can't
 * drift from the web. No React Native imports (vitest-safe).
 */
import type { MapBuilder } from '@/lib/data/map';
import { TRADE_SPECIALISATIONS } from '@/lib/web/trade-specialisations';
import { formatTradeName, getAllTrades } from '@/lib/web/trades';

/* ───────────────────────────── Filter chips ───────────────────────────── */

/** map-filter-bar.tsx FILTER_TRADES (display names; "All" first). */
export const FILTER_TRADES = [
  'All',
  'Builder',
  'Plumber',
  'Electrician',
  'Carpenter',
  'Painter',
  'Landscaper',
  'Roofer',
  'Tiler',
] as const;

export type FilterTrade = (typeof FILTER_TRADES)[number];

export interface SpecialtyToken {
  tradeSlug: string;
  tradeName: string;
  slug: string;
  name: string;
}

export const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '-');

export function matchesTrade(b: MapBuilder, trade: string): boolean {
  if (trade === 'All') return true;
  const t = norm(trade);
  return norm(b.trade_category) === t || (b.trade_categories ?? []).some((tc) => norm(tc) === t);
}

export function matchesSpecialty(b: MapBuilder, sp: SpecialtyToken | null): boolean {
  if (!sp) return true;
  return (b.specialisations?.[sp.tradeSlug] ?? []).includes(sp.slug);
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** A react-native-maps Region as a bounds test (Leaflet's `bounds.contains`). */
export interface RegionBounds {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export function regionContains(region: RegionBounds, point: LatLng): boolean {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return (
    point.latitude >= region.latitude - halfLat &&
    point.latitude <= region.latitude + halfLat &&
    point.longitude >= region.longitude - halfLng &&
    point.longitude <= region.longitude + halfLng
  );
}

/**
 * map-view.tsx baseFiltered: specialty + bounds applied first so chip counts
 * show what clicking each chip yields. Bounds filtering is client-side —
 * every geocoded profile is already loaded in one query.
 */
export function baseFilter(
  builders: readonly MapBuilder[],
  specialty: SpecialtyToken | null,
  bounds: RegionBounds | null,
): MapBuilder[] {
  return builders.filter(
    (b) =>
      matchesSpecialty(b, specialty) &&
      (!bounds || regionContains(bounds, { latitude: b.latitude, longitude: b.longitude })),
  );
}

export function filterByTrade(builders: readonly MapBuilder[], trade: string): MapBuilder[] {
  return builders.filter((b) => matchesTrade(b, trade));
}

/** Per-chip counts over the base-filtered set ("All" = everything). */
export function chipCounts(baseFiltered: readonly MapBuilder[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const t of FILTER_TRADES) {
    c[t] = t === 'All' ? baseFiltered.length : baseFiltered.filter((b) => matchesTrade(b, t)).length;
  }
  return c;
}

/* ───────────────────────────── Smart search ───────────────────────────── */

export interface TradeEntry {
  kind: 'trade';
  name: string;
  slug: string;
}

export interface SpecialtyEntry extends SpecialtyToken {
  kind: 'specialty';
}

export type SearchEntry = TradeEntry | SpecialtyEntry;

/** Static search index — trades + flattened specialisations with parent trade. */
export const TRADE_ENTRIES: TradeEntry[] = getAllTrades().map((t) => ({
  kind: 'trade',
  name: t.name,
  slug: t.slug,
}));

export const SPECIALTY_ENTRIES: SpecialtyEntry[] = Object.entries(TRADE_SPECIALISATIONS).flatMap(
  ([tradeSlug, specs]) =>
    specs.map((s) => ({
      kind: 'specialty' as const,
      tradeSlug,
      tradeName: formatTradeName(tradeSlug),
      slug: s.slug,
      name: s.name,
    })),
);

/** 0 = prefix, 1 = word-boundary prefix ("EV" → "EV Chargers"), 2 = substring, -1 = no match. */
export function rank(query: string, label: string): number {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.startsWith(q)) return 0;
  if (l.split(/[\s&/-]+/).some((w) => w.startsWith(q))) return 1;
  if (l.includes(q)) return 2;
  return -1;
}

export function searchIndex(query: string): { trades: TradeEntry[]; specialties: SpecialtyEntry[] } {
  const score = (e: SearchEntry) => rank(query, e.name);
  const trades = TRADE_ENTRIES.map((e) => [score(e), e] as const)
    .filter(([s]) => s >= 0)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 4)
    .map(([, e]) => e);
  const specialties = SPECIALTY_ENTRIES.map((e) => [score(e), e] as const)
    .filter(([s]) => s >= 0)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 6)
    .map(([, e]) => e);
  return { trades, specialties };
}

/** Step two of the smart search: a picked trade's own specialties. */
export function specialtiesForTrade(trade: TradeEntry): SpecialtyEntry[] {
  return (TRADE_SPECIALISATIONS[trade.slug] ?? []).map((s) => ({
    kind: 'specialty' as const,
    tradeSlug: trade.slug,
    tradeName: trade.name,
    slug: s.slug,
    name: s.name,
  }));
}

/** Flatten a builder's specialisations JSONB to display pills (slugs not in the catalogue are skipped). */
export function specialtyPills(
  specialisations: Record<string, string[]> | null | undefined,
): { slug: string; name: string }[] {
  const out: { slug: string; name: string }[] = [];
  for (const [tradeSlug, slugs] of Object.entries(specialisations ?? {})) {
    const catalog = TRADE_SPECIALISATIONS[tradeSlug];
    if (!catalog || !Array.isArray(slugs)) continue;
    for (const slug of slugs) {
      const entry = catalog.find((s) => s.slug === slug);
      if (entry) out.push({ slug, name: entry.name });
    }
  }
  return out;
}

/* ───────────────────────────── Presentation rules ───────────────────────────── */

/** builder-marker.tsx availability dot colours. */
export const AVAIL_DOT_HEX: Record<'available' | 'limited' | 'unavailable', string> = {
  available: '#22c55e',
  limited: '#f59e0b',
  unavailable: '#ef4444',
};

/** map-view.tsx createClusterIcon sizing. */
export function clusterSize(count: number): number {
  return count < 10 ? 34 : count < 50 ? 40 : 46;
}

/** map-empty-state.tsx headline. */
export function emptyStateHeadline(trade: string, specialty: string | null): string {
  return specialty
    ? `No tradies doing "${specialty}" here yet`
    : trade !== 'All'
      ? `No ${trade.toLowerCase()}s here yet`
      : 'No tradies here yet';
}

/** builder-list.tsx distance suffix: "<1" under a kilometre, else rounded. */
export function formatDistanceKm(distanceKm: number): string {
  return distanceKm < 1 ? '<1' : String(Math.round(distanceKm));
}

/** "3 tradies nearby" / "1 tradie found". */
export function tradieCountLabel(n: number, suffix: 'nearby' | 'found'): string {
  return `${n} tradie${n === 1 ? '' : 's'} ${suffix}`;
}

/** Sydney CBD — the map's default centre (map-view.tsx defaultCenter). */
export const DEFAULT_CENTER: LatLng = { latitude: -33.8688, longitude: 151.2093 };

/** Show "Search this area" once the map has moved > 5km from the reference point. */
export const SEARCH_AREA_THRESHOLD_KM = 5;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
