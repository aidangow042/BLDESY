/**
 * The noun rules behind WaitlistSearchFallback — lifted from
 * ~/bldesy-web/components/waitlist/search-fallback.tsx so they can be tested in
 * node. Naive `${name}s` produces "gutterings" and "a verified guttering" for the
 * identity-plural trades (guttering, drainage, flooring, paving…), so the real
 * nouns are resolved instead, the same way the web's /[trade]/[suburb] page does.
 */
import { getTradeBySlug, pluralNameFor, pluralSlugFor, type Trade } from '@/lib/web/trades';

/**
 * "Plumbers" where a real plural exists, "Guttering specialists" where the plural
 * IS the slug — the identity-plural trades have no person noun of their own.
 */
export function peopleNoun(trade: Trade): string {
  return pluralSlugFor(trade) === trade.slug ? `${trade.name} specialists` : pluralNameFor(trade);
}

/** The singular of the above: "plumber", "guttering specialist". */
export function personNoun(trade: Trade): string {
  return pluralSlugFor(trade) === trade.slug ? `${trade.name} specialist` : trade.name;
}

/** "plumbers, electricians and handymen" — an Oxford-comma-free Aussie list. */
export function liveTradeSentence(trades: Trade[]): string {
  const names = trades.map((t) => peopleNoun(t).toLowerCase());
  if (names.length === 0) return 'a first few verified trades';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Accept a slug or a Trade record; unknown slugs resolve to nothing. */
export function resolveTrade(trade: string | Trade | undefined | null): Trade | undefined {
  if (!trade) return undefined;
  return typeof trade === 'string' ? getTradeBySlug(trade) : trade;
}

/**
 * The two nouns the wall's copy is built from: "{who} in {where}" (plural) and
 * "a verified {oneOf}" (singular). Falls back to "tradies" / "tradie" when no
 * trade is known, and to a display name's naive plural when only a name is.
 */
export function fallbackNouns(trade: Trade | undefined, tradeName?: string): { who: string; oneOf: string } {
  const who = trade
    ? peopleNoun(trade).toLowerCase()
    : tradeName
      ? `${tradeName.toLowerCase()}s`
      : 'tradies';
  const oneOf = trade ? personNoun(trade).toLowerCase() : 'tradie';
  return { who, oneOf };
}
