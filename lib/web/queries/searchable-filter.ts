// AUTO-SYNCED from ~/bldesy-web/lib/queries/searchable-filter.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * The ONE searchable/discovery predicate (decided 2026-07-28) — every
 * discovery consumer (search, supply counts, trade landings, sitemap, map)
 * applies exactly this, so the definition can't drift between sites:
 *
 *   status ∈ (active, approved)   — passed the quality gate
 *   accepting_enquiries           — not billing-paused / card-overdue AND not
 *                                   tradie-paused (search_paused_at, 20260807)
 *   meets_listing_bar             — ABN-verified + service area + ≥1 photo
 *                                   (view-derived, 20260807; completeness %
 *                                   is a nudge target, never a listing gate)
 *
 * Unlisted profiles keep a live public URL (the view row stays; the profile
 * page shows a soft banner) — this predicate only governs being FOUND.
 *
 * Own module with zero imports: map-data.ts is pulled into the client
 * bundle by /map, so this must never drag server-only code with it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySearchableFilters<Q extends { in(c: string, v: string[]): any; eq(c: string, v: boolean): any }>(query: Q): Q {
  return query
    .in("status", ["active", "approved"])
    .eq("accepting_enquiries", true)
    .eq("meets_listing_bar", true) as Q;
}
