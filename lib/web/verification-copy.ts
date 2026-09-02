// AUTO-SYNCED from ~/bldesy-web/lib/verification-copy.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * THE canonical verification copy. Every surface that names the checks —
 * pages, components, emails — imports from here so the five-check set stays
 * byte-identical everywhere. Dependency-free: safe in client components,
 * server components and email templates.
 */

/** Standalone badge line — used verbatim under trust-pill rows. */
export const CHECKED_FIVE_WAYS =
  "Checked five ways — ABN, licence, photo ID, White Card, insurance.";

/** Prose form for embedding mid-sentence. */
export const FIVE_CHECKS_LIST =
  "ABN, licence, photo ID, White Card and insurance";

/** The five checks with their one-line proof, canonical order. */
export const FIVE_CHECKS = [
  { name: "ABN", detail: "checked against the Australian Business Register" },
  { name: "Licence", detail: "verified with NSW Fair Trading, in real time" },
  { name: "Photo ID", detail: "matched to the account, so no one trades on your name" },
  { name: "White Card", detail: "site-ready, checked" },
  { name: "Insurance", detail: "certificates AI-checked and human-reviewed" },
] as const;
