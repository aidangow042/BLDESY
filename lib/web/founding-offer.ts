// AUTO-SYNCED from ~/bldesy-web/lib/founding-offer.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Founding Tradie offer constants — the "first 200 lock launch rates
 * forever" launch-window incentive. Distinct from the per-trade zone caps
 * (lib/supply-caps.ts): those are permanent supply policy, this is a
 * one-off launch bonus layered on top.
 *
 * Client-safe on purpose: the cap appears in marketing copy and FAQs as
 * well as in the live counter. 200 is the real cap quoted everywhere —
 * change it here and the prose must change with it.
 */
export const FOUNDING_CAP = 200;

/**
 * The live counter stays hidden until this many spots are consumed — a
 * full "200 of 200 left" reads as nobody-joined.
 */
export const FOUNDING_COUNTER_MIN_TAKEN = 15;
