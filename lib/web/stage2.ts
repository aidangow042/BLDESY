// AUTO-SYNCED from ~/bldesy-web/lib/stage2.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Stage 2 = the business side going live (enterprises posting Project Jobs
 * and Contracts). Until then those tradie-portal surfaces would be empty
 * feeds — they're gated behind a "Releasing in Stage 2" teaser instead of
 * being hidden, so the roadmap stays visible without looking broken.
 *
 * Flip to true at Stage 2 launch: nav pills disappear and both feeds render
 * normally. One-line commit, same pattern as lib/prelaunch.ts.
 */
export const STAGE2_JOBS_LIVE = false;

export const STAGE2_BADGE = "Stage 2";
