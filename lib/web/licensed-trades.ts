// AUTO-SYNCED from ~/bldesy-web/lib/licensed-trades.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Trades that require a licence in Australia.
 * Used to conditionally show licence fields during builder registration.
 *
 * Source of truth is `lib/trade-licence-map.ts:TRADE_LICENCE_MAP` — any
 * trade with a non-null NSW or QLD requirement is treated as licensed.
 * Deriving here avoids the historical drift where new trades were added
 * to the map (civil-construction, commercial-builder, etc.) but missed
 * from this hardcoded list, so the licence step silently disappeared
 * on signup.
 */
import { TRADE_LICENCE_MAP } from "@/lib/web/trade-licence-map";

export const LICENSED_TRADES: ReadonlySet<string> = new Set(
  Object.entries(TRADE_LICENCE_MAP)
    .filter(([, entry]) => Boolean(entry.nsw) || Boolean(entry.qld))
    .map(([slug]) => slug),
);

export const LICENSE_TYPES = [
  "Builder Licence",
  "Electrical Licence",
  "Plumbing Licence",
  "Gas Fitting Licence",
  "Demolition Licence",
  "Asbestos Removal Licence",
  "Security Licence",
  "Pool Building Licence",
  "Roofing Licence",
  "Other",
];

/**
 * Check if a trade slug requires a licence.
 */
export function requiresLicense(tradeSlug: string): boolean {
  return LICENSED_TRADES.has(tradeSlug);
}

/**
 * Trades where NSW only requires a licence for jobs over $5,000 in
 * labour+materials (incl. GST) — the Home Building Act "trade work"
 * category. Below that threshold, having NO licence at all is completely
 * legitimate, unlike the zero-threshold "specialist work" trades
 * (Electrician, Plumber, Gas Fitter, Drainage, HVAC, Solar Installer),
 * which always require one regardless of job value.
 *
 * Confirmed against NSW Government's own category-of-work list — 2026-08-14
 * audit follow-up. Roofer (roof slating/tiling) and Guttering (roof
 * plumbing) were checked directly rather than assumed: both sit in the
 * $5,000-threshold "trade work" list, not zero-threshold specialist work,
 * despite "roof plumbing" sounding adjacent to the always-licensed plumbing
 * family. Source: nsw.gov.au "Roof plumbing work" and "Categories and
 * classes of building and trade work" pages.
 *
 * Used to soften the onboarding hard-block in app/join-as-a-tradie: these
 * trades still show the licence step (so a tradie WHO HAS a licence can
 * submit and verify it — see `verified` on `credentials_verified.licences[]`
 * for the record of that), but a missing licence must not block profile
 * creation. Also backs the "Not licensed — jobs under $X only" badge
 * (components/builder/credential-badges.tsx, components/search/builder-card.tsx)
 * and the signup consent step (app/join-as-a-tradie) — 2026-08-14.
 */
export const THRESHOLD_LICENSED_TRADES: ReadonlySet<string> = new Set([
  "builder",
  "carpenter",
  "concreter",
  "bricklayer",
  "painter",
  "tiler",
  "plasterer",
  "glazier",
  "renderer",
  "wallpapering",
  "waterproofer",
  "fencer",
  "stonemasonry",
  "pool-builder",
  "retaining-walls",
  "cabinet-maker",
  "cladding",
  "roofer",
  "guttering",
]);

/**
 * Check if a trade slug is threshold-licensed (see THRESHOLD_LICENSED_TRADES
 * above). Only meaningful when `requiresLicense(tradeSlug)` is also true.
 */
export function isThresholdLicensedTrade(tradeSlug: string): boolean {
  return THRESHOLD_LICENSED_TRADES.has(tradeSlug);
}

/**
 * NSW's minor-trade-work threshold (labour+materials, incl. GST) under
 * which THRESHOLD_LICENSED_TRADES legally require no licence at all. Single
 * source for the dollar figure so badge copy, signup consent copy, and any
 * future job-value gating can't drift from each other.
 */
export const NSW_THRESHOLD_AMOUNT = 5_000;

/**
 * QLD's equivalent QBCC minor-works threshold. NOT wired up anywhere —
 * BLDESY isn't operating in QLD yet, and the exact current figure needs
 * confirming against the QBCC Act (these thresholds get indexed/updated;
 * guessing it into working code is worse than leaving the gap visible, per
 * 2026-08-14 direction). `null` is the placeholder — every consumer of
 * NSW_THRESHOLD_AMOUNT (badge, signup consent) is currently NSW-only and
 * must NOT fall back to a guessed QLD number.
 *
 * TODO before operating in QLD: confirm the current QBCC minor-works
 * threshold, set this constant, add a QLD counterpart to
 * THRESHOLD_LICENSED_TRADES (QLD's threshold-vs-always-licensed split may
 * not match NSW's trade-for-trade), and thread state-aware copy through the
 * badge + consent step the same way NSW_THRESHOLD_AMOUNT does today.
 */
export const QLD_THRESHOLD_AMOUNT: number | null = null;

/**
 * True when every one of a profile's/signup's trades is a threshold trade —
 * i.e. none of them are zero-threshold "specialist work" trades that always
 * need a licence. Used to decide whether the stronger signup consent step
 * applies (app/join-as-a-tradie) — a profile mixing a threshold trade with
 * an always-licensed one doesn't get it, since the always-licensed trade is
 * already hard-gated on a verified licence.
 */
export function allTradesThresholdOnly(tradeSlugs: readonly string[]): boolean {
  return tradeSlugs.length > 0 && tradeSlugs.every((slug) => THRESHOLD_LICENSED_TRADES.has(slug));
}

/**
 * Given a profile's trade slugs and the subset that currently have a
 * verified licence, return the threshold trades with NO verified licence —
 * the trades where "not licensed" is legally fine below $5,000 but must
 * still be surfaced honestly (badge copy) rather than left as a silent gap
 * or implied as verified. Per-trade on purpose: a profile can hold a real
 * licence for one trade while relying on the threshold for another.
 */
export function unlicensedThresholdTrades(
  tradeSlugs: readonly string[],
  verifiedTradeSlugs: ReadonlySet<string>,
): string[] {
  return tradeSlugs.filter(
    (slug) => THRESHOLD_LICENSED_TRADES.has(slug) && !verifiedTradeSlugs.has(slug),
  );
}
