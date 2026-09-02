// AUTO-SYNCED from ~/bldesy-web/lib/referrals/config.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Tradie refer-a-tradie — single source of truth for the knobs.
 *
 * Change reward amount / label / caps here; nothing else hardcodes them.
 * No `server-only` import: client components use REWARD_LABEL in UI copy.
 * amount_cents is snapshotted onto each signup_attributions row at creation,
 * so changing REWARD_AMOUNT_AUD later never rewrites what's already owed.
 */

export const REWARD_AMOUNT_AUD = 20;
export const REWARD_AMOUNT_CENTS = REWARD_AMOUNT_AUD * 100;
export const REWARD_LABEL = "$20";

/** Reward counts when the referred tradie completes verification, not on signup. */
export const REFERRAL_TRIGGER = "verified" as const;

/**
 * Program cap per referrer per calendar year — the number published in
 * /legal/referral-terms cl 4.1 and surfaced in the portal copy. Terms-level
 * only: settle.ts does not enforce it, so the exposure is paying past our own
 * published cap, not shorting a referrer.
 */
export const REWARD_CAP_PER_YEAR = 10;
export const REWARD_CAP_AMOUNT_AUD = REWARD_CAP_PER_YEAR * REWARD_AMOUNT_AUD;

/** Soft cap surfaced in the ops dashboard — flags a referrer for review, never blocks. */
export const MAX_UNPAID_PENDING_PER_TRADIE = 10;

export const CODE_PREFIX = "BLD-";
/** Unambiguous alphabet — no 0/O, 1/I/L. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 5;
export const CODE_REGEX = /^BLD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

/**
 * The /join?ref=CODE carry. A cookie (not a query param) because it must
 * survive the email-confirm round trip between /signup and the wizard.
 * Readable client-side for the wizard prefill — the value is non-sensitive
 * and re-validated server-side on submit.
 */
export const REFERRAL_COOKIE_NAME = "bld_ref";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
