// AUTO-SYNCED from ~/bldesy-web/lib/billing/config.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Value-gated billing config — every knob in one place, same pattern as
 * lib/followups/config.ts.
 *
 * The model: a tradie is free until CONTACT_THRESHOLD unique homeowners reach
 * out (qualified contacts), then a graceDays() grace period starts with a
 * Stripe subscription created at trial_end = grace end. PRE_CHARGE_LEAD_DAYS
 * before the charge a reminder goes out (AU consumer-friendly: no silent
 * first charge). A junk enquiry can be voided within VOID_WINDOW_DAYS.
 *
 * No "server-only": pure data + tiny helpers, shared with unit tests and
 * client components (the billing page meter reads CONTACT_THRESHOLD).
 */

/** app_flags row gating INTAKE: card step, contact metering, grace starts,
 *  card_required stamping. Enforcement (grace end, dunning, drift) runs
 *  regardless so in-flight cycles are never stranded by a flag flip. */
export const VG_FLAG = "value_gated_billing";
/** app_flags row: false = notices dry-run (log would-sends, send nothing). */
export const VG_LIVE_FLAG = "value_gated_billing_live";

/** Qualified contacts before the free period ends. */
export const CONTACT_THRESHOLD = 3;

/** Grace period length (= Stripe trial length). */
export const DEFAULT_GRACE_DAYS = 14;

/** Days BEFORE the grace-end charge the pre-charge reminder goes out. */
export const PRE_CHARGE_LEAD_DAYS = 4;

/** Days a tradie has to flag an enquiry as junk after receiving it. */
export const VOID_WINDOW_DAYS = 7;

/** Days between the card_required stamp and being hidden from discovery.
 *  MUST match the interval in the public_builder_profiles view (20260723). */
export const CARD_WINDOW_DAYS = 7;

/** Days in past_due before the sweep cancels the sub and pauses the tradie
 *  (backstop under Stripe Smart Retries, which usually resolves sooner). */
export const DUNNING_TIMEOUT_DAYS = 14;

/**
 * Grace length in days. VG_GRACE_DAYS (server env, may be fractional, e.g.
 * "0.02" ≈ 29 min) exists ONLY for seeded walkthroughs — Stripe rejects a
 * trial_end that isn't sensibly in the future, so keep overrides ≥ ~0.01.
 * Unset (every real deployment) = DEFAULT_GRACE_DAYS.
 */
export function graceDays(): number {
  const raw = process.env.VG_GRACE_DAYS;
  if (!raw) return DEFAULT_GRACE_DAYS;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 365) {
    return DEFAULT_GRACE_DAYS;
  }
  return parsed;
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
