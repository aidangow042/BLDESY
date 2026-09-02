// AUTO-SYNCED from ~/bldesy-web/lib/launch.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Single source of truth for the public launch date.
 *
 * This claim is genuinely load-bearing — it appears on the waitlist hero pill,
 * the confirmation state, the homepage, /search, /map, every pre-launch trade
 * landing (including one page TITLE that Google indexes) and the CTA on every
 * blog post. Swap this one value and all of them change.
 *
 * It only actually became single-source on 2026-07-30. Before that this file
 * claimed the same thing while THIRTEEN other places hardcoded "August 2026"
 * independently, so changing it here would have left most of the site
 * promising the old date. If you add a surface that names the date, import it
 * — don't type it.
 *
 * Deliberately vague for now (Aidan, 2026-07-30): the real date gets set when
 * the launch gate is functionally met, not from a calendar, and a specific
 * month we might miss is a worse promise than an honest range. Replace with
 * e.g. "March 2027" once it's locked.
 *
 * PHRASING CONTRACT: call sites read "Launching {LAUNCH_DATE}", "launches in
 * {LAUNCH_DATE}" and "we launch in inner Sydney in {LAUNCH_DATE}". Keep this a
 * bare display fragment with no leading preposition ("late 2026", "March
 * 2027") or those sentences break.
 */
export const LAUNCH_DATE = "Summer 2026";
