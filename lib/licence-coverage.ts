// Construction-umbrella licence coverage — pragmatic port of the website's
// logic in bldesy-web/lib/trade-licence-map.ts.
//
// Decides whether a verified licence a builder ALREADY holds "covers" another
// trade, so adding that trade in edit-profile doesn't demand a new licence.
//
// Simplified vs web: the website uses a full per-trade CATEGORY_ALIASES alias
// engine. Here we cover the cases that matter on mobile:
//   - exact-trade match (they already hold a verified licence for that trade)
//   - the Builder/Civil umbrella — a Builder-class licence covers building +
//     civil trades; a civil-class licence covers civil trades.
// Specialist trades (plumber, electrician, …) still require their own verified
// licence — a Builder licence does NOT cover them.

import { tradeRequiresLicence } from "./trade-licence-map";

export const BUILDER_ONLY_UMBRELLA: ReadonlySet<string> = new Set([
  "builder",
  "commercial-builder",
  "industrial-fit-out",
  "data-centre-construction",
]);

export const CIVIL_UMBRELLA: ReadonlySet<string> = new Set([
  "civil-construction",
  "earthworks-excavation",
  "infrastructure-roads",
]);

// Class strings (already normalised: lowercase, no spaces/punctuation) that a
// register returns for a licence authorising general building work.
const BUILDER_CLASS_ALIASES: readonly string[] = [
  "contractorlicence",
  "contractorbuilder",
  "builder",
  "buildingcontractor",
  "generalbuilding",
  "buildingwork",
  "generalbuildingwork",
  "builderopen",
  "builderlowrise",
  "buildermediumrise",
];

// Class strings a civil contractor might hold (sufficient for civil work).
const CIVIL_CLASS_ALIASES: readonly string[] = [
  "generalconcretor",
  "concretor",
  "demolition",
  "earthworks",
  "excavation",
  "structurallandscaping",
  "asphalt",
  "drainer",
  "concreting",
  "drainage",
];

function normalise(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function classMatches(aliases: readonly string[], category: string | null | undefined): boolean {
  const n = normalise(category);
  if (!n) return false;
  return aliases.some((a) => n === a || n.includes(a));
}

/** A verified licence the builder holds (from credentials_verified.licences). */
export interface HeldLicence {
  /** Trade the licence is for (the licence's `type`). */
  type?: string | null;
  /** Class/category string returned by the register, if stored. */
  category?: string | null;
  verified?: boolean;
}

/** Does this trade require a licence in NSW or QLD? */
export function requiresLicence(tradeSlug: string): boolean {
  return tradeRequiresLicence(tradeSlug, "NSW") || tradeRequiresLicence(tradeSlug, "QLD");
}

export function isBuilderUmbrellaTrade(tradeSlug: string): boolean {
  return BUILDER_ONLY_UMBRELLA.has(tradeSlug) || CIVIL_UMBRELLA.has(tradeSlug);
}

/**
 * True if one of the builder's verified licences already covers `targetSlug`:
 *  - exact: a verified licence for the same trade, OR
 *  - umbrella: a Builder-class licence (covers BUILDER_ONLY + CIVIL trades) or
 *    a civil-class licence (covers CIVIL trades).
 */
export function licenceCoversTrade(targetSlug: string, held: HeldLicence[]): boolean {
  const verified = (held ?? []).filter((l) => l && l.verified);
  if (verified.length === 0) return false;

  // Exact: already verified for this very trade.
  if (verified.some((l) => (l.type ?? "").toLowerCase() === targetSlug)) return true;

  if (BUILDER_ONLY_UMBRELLA.has(targetSlug)) {
    return verified.some((l) => classMatches(BUILDER_CLASS_ALIASES, l.category));
  }
  if (CIVIL_UMBRELLA.has(targetSlug)) {
    return verified.some(
      (l) =>
        classMatches(BUILDER_CLASS_ALIASES, l.category) ||
        classMatches(CIVIL_CLASS_ALIASES, l.category),
    );
  }
  return false;
}
