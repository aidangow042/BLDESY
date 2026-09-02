// AUTO-SYNCED from ~/bldesy-web/lib/business-types.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Business segments for the hiring side of BLDESY.
 *
 * The "enterprise" side is no longer construction-only — any business that hires
 * a tradie can list (strata & property managers, facilities managers, hospitality,
 * retail, developers, plus builders). This captures *what kind* of business an
 * account is, so we can model and target segments (strata/property managers are
 * the lead wedge). Optional at signup — never gates anything on its own.
 *
 * Machine values are mirrored by a CHECK constraint in
 * supabase/migrations/20260620_enterprise_business_type.sql — keep them in sync.
 */
export type BusinessType =
  | "strata_property_manager"
  | "facilities_manager"
  | "hospitality"
  | "retail"
  | "real_estate_developer"
  | "builder_construction"
  | "other";

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "strata_property_manager", label: "Strata / property manager" },
  { value: "facilities_manager", label: "Facilities manager" },
  { value: "hospitality", label: "Hospitality (café, pub, restaurant)" },
  { value: "retail", label: "Retail / shopfront" },
  { value: "real_estate_developer", label: "Real estate / developer" },
  { value: "builder_construction", label: "Construction / building" },
  { value: "other", label: "Other" },
];

/**
 * Whether a segment should default the signup licence gate to "yes".
 * Only construction businesses hold a building/civil contractor licence —
 * everyone else (strata, hospitality, retail, facilities) just hires trades.
 */
export function businessTypeHoldsLicenceByDefault(
  value: BusinessType | "" | null,
): boolean {
  return value === "builder_construction";
}
