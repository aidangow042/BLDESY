/**
 * Pure search-screen logic — the URL-param contract, option lists and copy
 * rules of the website's /search surface, lifted out of:
 *   ~/bldesy-web/components/search/search-form.tsx      (option lists, keyword hints, submit params)
 *   ~/bldesy-web/components/search/search-filters.tsx   (sort/urgency options, param updates)
 *   ~/bldesy-web/components/search/search-results-header.tsx (heading rule)
 *   ~/bldesy-web/components/search/pagination.tsx       (visible page window)
 *   ~/bldesy-web/app/search/page.tsx                    (param parsing, showResults rule)
 *
 * No React / React Native imports so it unit-tests under vitest.
 */
import { getAllTrades, getTradeBySlug, type Trade } from '@/lib/web/trades';
import type { BuilderSpecialisations } from '@/lib/web/trade-specialisations';
import type { BuilderSortOption } from '@/types';

/* ───────────────────────────── Option lists ───────────────────────────── */

export interface SortOption {
  label: string;
  value: BuilderSortOption;
}

/** search-filters.tsx SORT_OPTIONS. */
export const SEARCH_SORT_OPTIONS: readonly SortOption[] = [
  { label: 'Best Match', value: 'relevance' },
  { label: 'Top Rated', value: 'rating' },
  { label: 'Available Now', value: 'available' },
  { label: 'Newest', value: 'newest' },
];

/** Distance sorting needs a searched location to measure from. */
export const CLOSEST_SORT_OPTION: SortOption = { label: 'Closest', value: 'closest' };

/** "Closest" slots in second, only when a location was searched. */
export function sortOptionsFor(hasLocation: boolean): SortOption[] {
  return hasLocation
    ? [SEARCH_SORT_OPTIONS[0], CLOSEST_SORT_OPTION, ...SEARCH_SORT_OPTIONS.slice(1)]
    : [...SEARCH_SORT_OPTIONS];
}

export interface UrgencyOption {
  label: string;
  value: string;
}

/** search-form.tsx URGENCY_OPTIONS (the segmented control on the form). */
export const FORM_URGENCY_OPTIONS: readonly UrgencyOption[] = [
  { label: 'Any', value: '' },
  { label: 'ASAP', value: 'asap' },
  { label: 'This week', value: 'this_week' },
  { label: 'Flexible', value: 'flexible' },
];

/** search-filters.tsx URGENCY_OPTIONS (the filter panel). */
export const FILTER_URGENCY_OPTIONS: readonly UrgencyOption[] = [
  { label: 'All', value: '' },
  { label: 'ASAP', value: 'asap' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Flexible', value: 'flexible' },
];

/** Ionicons names standing in for the web's inline stroke icons. */
export type FeaturedIcon =
  | 'business-outline'
  | 'water-outline'
  | 'flash-outline'
  | 'hammer-outline'
  | 'brush-outline'
  | 'home-outline';

export interface FeaturedTrade {
  slug: string;
  icon: FeaturedIcon;
  plural: string;
  name: string;
}

const ALL_TRADES = getAllTrades();

/** search-form.tsx FEATURED_TRADES — drives the Popular chips + Browse-by-trade grid. */
export const FEATURED_TRADES: readonly FeaturedTrade[] = (
  [
    { slug: 'builder', icon: 'business-outline', plural: 'Builders' },
    { slug: 'plumber', icon: 'water-outline', plural: 'Plumbers' },
    { slug: 'electrician', icon: 'flash-outline', plural: 'Electricians' },
    { slug: 'carpenter', icon: 'hammer-outline', plural: 'Carpenters' },
    { slug: 'painter', icon: 'brush-outline', plural: 'Painters' },
    { slug: 'roofer', icon: 'home-outline', plural: 'Roofers' },
  ] as const
).map((f) => ({ ...f, name: ALL_TRADES.find((t) => t.slug === f.slug)?.name ?? f.slug }));

/* ───────────────────────────── Keyword hints ───────────────────────────── */

/** Keyword → likely trades, for the hint chip under the keywords field (verbatim). */
export const KEYWORD_TRADE_HINTS: Record<string, string[]> = {
  deck: ['carpenter', 'builder'],
  pergola: ['carpenter', 'builder'],
  bathroom: ['plumber', 'tiler'],
  kitchen: ['cabinet-maker', 'builder'],
  renovation: ['builder'],
  extension: ['builder'],
  fence: ['fencer'],
  paint: ['painter'],
  roof: ['roofer'],
  gutter: ['guttering'],
  leak: ['plumber'],
  'hot water': ['hot-water-systems', 'plumber'],
  toilet: ['plumber'],
  drain: ['drainage', 'plumber'],
  light: ['electrician'],
  power: ['electrician'],
  switchboard: ['electrician'],
  solar: ['solar-installer'],
  aircon: ['air-conditioning-hvac'],
  'air con': ['air-conditioning-hvac'],
  tile: ['tiler'],
  tiling: ['tiler'],
  plaster: ['plasterer'],
  driveway: ['concreter'],
  concrete: ['concreter'],
  landscaping: ['landscaper'],
  garden: ['landscaper'],
  lawn: ['landscaper'],
  tree: ['tree-services'],
  pool: ['pool-builder'],
  shed: ['handyman', 'builder'],
};

export interface KeywordHint {
  keyword: string;
  trades: Trade[];
}

/**
 * Map what the user is typing to a likely trade. Word-boundary matching so
 * "waterproofing" doesn't hint Roofer via the "roof" key. Null below 3 chars.
 */
export function keywordHintFor(input: string): KeywordHint | null {
  const q = input.trim().toLowerCase();
  if (q.length < 3) return null;
  const words = q.split(/\s+/);
  const match = Object.keys(KEYWORD_TRADE_HINTS).find((k) =>
    k.includes(' ') ? q.includes(k) : words.some((w) => w.startsWith(k)) || k.startsWith(q),
  );
  if (!match) return null;
  const trades = KEYWORD_TRADE_HINTS[match]
    .map((slug) => ALL_TRADES.find((t) => t.slug === slug))
    .filter((t): t is Trade => !!t);
  if (trades.length === 0) return null;
  return { keyword: match, trades };
}

/** Add a keyword the way the form does: trimmed, lowercased, deduped. */
export function addKeyword(keywords: readonly string[], raw: string): string[] {
  const kw = raw.trim().toLowerCase();
  if (!kw || keywords.includes(kw)) return [...keywords];
  return [...keywords, kw];
}

/* ───────────────────────────── URL params ───────────────────────────── */

export type RawParams = Record<string, string | string[] | undefined>;

export function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export interface SearchQuery {
  trade?: string;
  location?: string;
  urgency?: string;
  keywords?: string;
  specialisations?: string;
  sort: BuilderSortOption;
  page: number;
  verified: boolean;
  licensed_in?: string;
  show?: string;
}

const SORT_VALUES: ReadonlySet<string> = new Set(['relevance', 'rating', 'newest', 'closest', 'available']);

/** app/search/page.tsx param reads, incl. the "Number(...) || 1" page rule. */
export function parseSearchQuery(params: RawParams): SearchQuery {
  const rawSort = asString(params.sort) ?? 'relevance';
  const sort = (SORT_VALUES.has(rawSort) ? rawSort : 'relevance') as BuilderSortOption;
  return {
    trade: asString(params.trade) || undefined,
    location: asString(params.location) || undefined,
    urgency: asString(params.urgency) || undefined,
    keywords: asString(params.keywords) || undefined,
    specialisations: asString(params.specialisations) || undefined,
    sort,
    page: Math.max(1, Number(asString(params.page)) || 1),
    verified: asString(params.verified) === 'true',
    licensed_in: asString(params.licensed_in) || undefined,
    show: asString(params.show) || undefined,
  };
}

/** The website's "show results or the form" rule. */
export function hasSearchQuery(q: SearchQuery): boolean {
  return !!(q.trade || q.location || q.urgency || q.keywords || q.specialisations || q.show);
}

/** Comma-list param → trimmed non-empty items. */
export function splitList(raw: string | undefined): string[] {
  return raw?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
}

export interface SearchFormState {
  trades: readonly string[];
  location: string;
  urgency: string;
  keywords: readonly string[];
  /** A word still sitting in the keyword input at submit time. */
  pendingKeyword: string;
  specialisations: BuilderSpecialisations;
}

/**
 * search-form.tsx handleSubmit — the params the form navigates with. Always
 * `show=results`; keywords deduped with the pending word; specialities kept
 * only for trades that are actually selected.
 */
export function buildSearchParams(form: SearchFormState): Record<string, string> {
  const params: Record<string, string> = { show: 'results' };
  if (form.trades.length > 0) params.trade = form.trades.join(',');
  const location = form.location.trim();
  if (location) params.location = location;
  if (form.urgency) params.urgency = form.urgency;
  const pending = form.pendingKeyword.trim().toLowerCase();
  const allKw = Array.from(new Set([...form.keywords, ...(pending ? [pending] : [])]));
  if (allKw.length > 0) params.keywords = allKw.join(',');
  const specSlugs = Array.from(new Set(form.trades.flatMap((t) => form.specialisations[t] ?? [])));
  if (specSlugs.length > 0) params.specialisations = specSlugs.join(',');
  return params;
}

/** `?a=1&b=2` — encoded, deterministic key order as inserted. */
export function toQueryString(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join('&');
}

/** `/search?…` for a param object. */
export function searchHref(params: Record<string, string | undefined>): string {
  const qs = toQueryString(params);
  return qs ? `/search?${qs}` : '/search';
}

/** Every current param as `key → string | undefined`, ready for the updaters below. */
export type ParamPatch = Record<string, string | undefined>;

function currentParams(params: RawParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    const s = asString(v);
    if (s !== undefined && s !== '') out[k] = s;
  }
  return out;
}

/**
 * search-filters.tsx updateParam: set/delete one key and drop `page`.
 * Removed keys come back as `undefined` so `router.setParams` clears them.
 */
export function withParam(params: RawParams, key: string, value: string): ParamPatch {
  const next: ParamPatch = { ...currentParams(params) };
  if (value) next[key] = value;
  else next[key] = undefined;
  next.page = undefined;
  return next;
}

/** search-filters.tsx removeSpec. */
export function withoutSpecialisation(params: RawParams, slug: string): ParamPatch {
  const remaining = splitList(asString(params.specialisations)).filter((s) => s !== slug);
  return withParam(params, 'specialisations', remaining.join(','));
}

/** search-filters.tsx toggleVerified. */
export function withVerifiedToggled(params: RawParams): ParamPatch {
  const verifiedOnly = asString(params.verified) === 'true';
  return withParam(params, 'verified', verifiedOnly ? '' : 'true');
}

/** search-filters.tsx resetFilters — keeps only trade + location. */
export function resetFilterParams(params: RawParams): ParamPatch {
  const next: ParamPatch = {};
  for (const key of Object.keys(currentParams(params))) next[key] = undefined;
  const trade = asString(params.trade);
  const location = asString(params.location);
  if (trade) next.trade = trade;
  if (location) next.location = location;
  // A filtered-down search stays on the results surface.
  next.show = 'results';
  return next;
}

/** pagination.tsx goToPage — page 1 drops the param. */
export function withPage(params: RawParams, page: number): ParamPatch {
  const next: ParamPatch = { ...currentParams(params) };
  next.page = page <= 1 ? undefined : String(page);
  return next;
}

/** Toggle one state in the multi-select "Licensed in" filter. */
export function toggleLicensedState(current: readonly string[], state: string): string[] {
  return current.includes(state) ? current.filter((s) => s !== state) : [...current, state];
}

/* ───────────────────────────── Copy rules ───────────────────────────── */

/** "Plumber, Electrician" — display names for the comma-separated trade param. */
export function tradeNamesFor(tradeParam: string | undefined): string | undefined {
  if (!tradeParam) return undefined;
  return tradeParam
    .split(',')
    .map((s) => getTradeBySlug(s)?.name ?? s)
    .join(', ');
}

/** search-results-header.tsx heading rule. */
export function resultsHeading(trade?: string, location?: string): string {
  if (trade && location) return `${trade} in ${location}`;
  if (trade) return trade;
  if (location) return `Tradies in ${location}`;
  return 'All Tradies';
}

/** "Showing 1 result" / "Showing 12 results". */
export function resultsCountLabel(total: number): string {
  return `Showing ${total} result${total === 1 ? '' : 's'}`;
}

/** pagination.tsx visible window: current ± 2, clamped. */
export function pageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export type MatchTone = 'high' | 'mid' | 'low';

/** builder-card.tsx match badge colour buckets (≥80 success, ≥60 amber, else black/60). */
export function matchTone(percent: number): MatchTone {
  if (percent >= 80) return 'high';
  if (percent >= 60) return 'mid';
  return 'low';
}

/** "Not licensed — jobs under $5,000 only" — one line for the card. */
export function thresholdBadgeLabel(amount: number): string {
  return `Not licensed — jobs under $${amount.toLocaleString('en-AU')} only`;
}

/** "1 specialty" / "3 specialties". */
export function specialtiesCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'specialty' : 'specialties'}`;
}
