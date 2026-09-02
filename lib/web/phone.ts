// AUTO-SYNCED from ~/bldesy-web/lib/phone.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Australian mobile number helpers — client- and server-safe (no "server-only"),
 * so both the SMS sender and the settings/onboarding UI share one source of truth.
 */

/**
 * Normalise an Australian mobile number to E.164 (614xxxxxxxx).
 * Returns null for anything that isn't a valid AU mobile.
 */
export function normaliseE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0")) d = `61${d.slice(1)}`; // 04xxxxxxxx -> 614xxxxxxxx
  else if (/^4\d{8}$/.test(d)) d = `61${d}`; // bare 4xxxxxxxx -> 614xxxxxxxx
  return /^614\d{8}$/.test(d) ? d : null;
}

/** True if `raw` is a valid AU mobile (for inline form validation). */
export function isValidAuMobile(raw: string | null | undefined): boolean {
  return normaliseE164(raw) !== null;
}

/**
 * Display form of an AU mobile: 614xxxxxxxx -> "0412 345 678".
 * Returns null when the input isn't a valid AU mobile.
 */
export function formatAuMobile(raw: string | null | undefined): string | null {
  const e164 = normaliseE164(raw);
  if (!e164) return null;
  const local = `0${e164.slice(2)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
