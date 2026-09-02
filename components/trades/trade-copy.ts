/**
 * Pure copy + slug rules for the trade landings, lifted verbatim from
 * ~/bldesy-web/app/[trade]/page.tsx and ~/bldesy-web/app/[trade]/[suburb]/page.tsx
 * (peopleNounFor, placeLabel, variantIndex, introCopy, resolveSegs' plural-first
 * trade resolution, the launch-six cross-link rule).
 */
import { isLaunchTrade } from '@/lib/web/launch-trades';
import type { SuburbEntry } from '@/lib/web/suburbs';
import {
  TRADE_CATEGORIES,
  getAllTrades,
  getTradeByPluralSlug,
  getTradeBySlug,
  pluralNameFor,
  pluralSlugFor,
  type Trade,
  type TradeCategory,
} from '@/lib/web/trades';
import { FIVE_CHECKS_LIST } from '@/lib/web/verification-copy';

/** "Plumbers" when a real plural exists, else "Drainage specialists". */
export function peopleNounFor(trade: Trade): string {
  return pluralSlugFor(trade) === trade.slug ? `${trade.name} specialists` : pluralNameFor(trade);
}

/** "Sydney, NSW" for major cities; bare suburb name otherwise. */
export function placeLabel(entry: SuburbEntry): string {
  return entry.isMajorCity && entry.state ? `${entry.name}, ${entry.state}` : entry.name;
}

export function variantIndex(seed: string, n: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

/**
 * The unique intro block. Not boilerplate: the paragraph shape rotates
 * deterministically per trade×suburb, and the fact slots (live count, place,
 * state, trade description, actual nearby suburbs) differ page to page.
 */
export function introCopy(
  trade: Trade,
  entry: SuburbEntry,
  state: string | null,
  count: number | null,
  nearby: SuburbEntry[],
): string {
  const people = peopleNounFor(trade).toLowerCase();
  const place = entry.name;
  const statePart = state ? `, ${state}` : '';
  const countPart = count && count > 0 ? `${count} verified ${people}` : `verified ${people}`;
  const nearbyPart =
    nearby.length >= 2 ? `${nearby[0].name} and ${nearby[1].name}` : 'the surrounding suburbs';

  const variants = [
    `Looking for ${people} in ${place}? BLDESY lists ${countPart} servicing ${place}${statePart} right now. ${trade.description}. Every tradie is checked five ways before they appear here, so you can compare profiles, read reviews and reach out with confidence.`,
    `${place} locals can compare ${countPart} on BLDESY. ${trade.description}. We check every profile five ways — ${FIVE_CHECKS_LIST} — before it goes live, and coverage extends to nearby areas like ${nearbyPart}.`,
    `BLDESY makes it simple to find ${people} in ${place}${statePart}: ${countPart} currently service the area. ${trade.description}. Browse their projects and reviews below, or post your job and let them come to you.`,
    `Need ${people} around ${place}? BLDESY has ${countPart} covering ${place} and neighbours such as ${nearbyPart}. ${trade.description}. Message them directly — quotes are free.`,
    `From quick fixes to full projects, ${countPart} service ${place}${statePart} through BLDESY. ${trade.description}. Check their credentials, compare reviews from other locals and get in touch in a couple of taps.`,
  ];
  return variants[variantIndex(`${trade.slug}:${entry.slug}`, variants.length)];
}

/** The national landing's hero paragraph (app/[trade]/page.tsx). */
export function nationalIntroCopy(trade: Trade): string {
  const people = peopleNounFor(trade).toLowerCase();
  return `${trade.description}. BLDESY checks every tradie five ways — ${FIVE_CHECKS_LIST} — before ${people} appear here. Pick your area below or search your suburb to compare profiles, reviews and availability.`;
}

/**
 * A route segment → trade. Plural first (identity-plural trades like
 * "drainage" must resolve as a category), then the singular slug so
 * `/trades/plumber` works as well as `/trades/plumbers`.
 */
export function resolveTradeSegment(seg: string | undefined): Trade | undefined {
  if (!seg) return undefined;
  const lowered = seg.trim().toLowerCase();
  if (!lowered) return undefined;
  return getTradeByPluralSlug(lowered) ?? getTradeBySlug(lowered);
}

/**
 * Cross-links go to the launch six only (minus the current trade) — the
 * hand-typed list this replaced minted internal links to zero-supply pages.
 */
export function otherLaunchTrades(currentSlug: string): Trade[] {
  return getAllTrades()
    .filter((t) => isLaunchTrade(t.slug))
    .filter((t) => t.slug !== currentSlug)
    .slice(0, 6);
}

/** "Verified plumbers on BLDESY" + optional " — 12 listed" meta. */
export function verifiedHeading(trade: Trade, count: number | null): { title: string; meta: string | null } {
  const people = peopleNounFor(trade).toLowerCase();
  return {
    title: `Verified ${people} on BLDESY`,
    meta: count ? `— ${count} listed` : null,
  };
}

/**
 * components/trades/trade-filter.tsx (web): case-insensitive substring match on
 * the trade name; categories left with no matches drop out; blank = everything.
 */
export function filterTradeCategories(query: string): TradeCategory[] {
  const normalised = query.toLowerCase().trim();
  if (!normalised) return TRADE_CATEGORIES;
  return TRADE_CATEGORIES.map((cat) => ({
    ...cat,
    trades: cat.trades.filter((t) => t.name.toLowerCase().includes(normalised)),
  })).filter((cat) => cat.trades.length > 0);
}
