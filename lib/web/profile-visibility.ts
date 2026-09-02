// AUTO-SYNCED from ~/bldesy-web/lib/profile-visibility.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

import type { ProfileVisibilityMap } from "@/types";

/**
 * Profile-visibility section keys — the single source of truth.
 *
 * Keys live in builder_profiles.profile_visibility / enterprise_profiles
 * .profile_visibility (JSONB, migration 20260704). ABSENT KEY = VISIBLE; only
 * false keys are stored, so existing profiles ship unchanged.
 *
 * Every toggle declares WHERE it is enforced (`enforcement`) and
 * __tests__/profile-visibility.test.ts asserts that site actually exists —
 * a key without a real gate would render a toggle that saves but silently
 * hides nothing, which is this feature's worst failure mode.
 */

/**
 * Where a toggle is enforced:
 *  - "view":   CASE-NULLed inside the public_* view (latest view migration) —
 *              the data is unreadable off the anon key when off.
 *  - "page":   checked via isSectionVisible() in the public profile page —
 *              used when search/matching still needs the column exposed.
 *  - "column": backed by a dedicated boolean column the view already gates
 *              (display_bldesy_score); panel pages special-case the write.
 */
export type VisibilityEnforcement = "view" | "page" | "column";

/** Toggle backed by builder_profiles.display_bldesy_score (a real column that
 *  the public view already gates), NOT by the profile_visibility JSONB.
 *  Panel pages special-case this key when saving. */
export const BLDESY_SCORE_TOGGLE_KEY = "bldesy_score";

export type VisibilityRow =
  | {
      kind: "toggle";
      key: string;
      label: string;
      description: string;
      enforcement: VisibilityEnforcement;
    }
  | {
      /** Trust signals that can never be hidden — lock icon + "Always shown". */
      kind: "locked";
      label: string;
      description: string;
    };

export interface VisibilityGroup {
  title: string;
  rows: VisibilityRow[];
}

/** Absent key = visible. Only an explicit false hides a section. */
export function isSectionVisible(
  visibility: ProfileVisibilityMap | null | undefined,
  key: string,
): boolean {
  return visibility?.[key] !== false;
}

/* ── Builder (tradie) panel ──────────────────────────────────────── */

export const BUILDER_VISIBILITY_GROUPS: VisibilityGroup[] = [
  {
    title: "Verified credentials",
    rows: [
      {
        kind: "locked",
        label: "Verification status",
        description: "ABN and identity checks on your trust band",
      },
      {
        kind: "locked",
        label: "Licences",
        description: "Your verified trade licences and licensed states",
      },
      {
        kind: "locked",
        label: "Insurance",
        description: "Your verified insurance cover",
      },
      {
        kind: "toggle",
        key: BLDESY_SCORE_TOGGLE_KEY,
        label: "BLDESY Score",
        description: "Your 0–100 trust score on the trust band",
        enforcement: "column",
      },
    ],
  },
  {
    title: "Profile sections",
    rows: [
      {
        kind: "toggle",
        key: "about",
        label: "About",
        description: "Your business bio",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "services",
        label: "Services & specialisations",
        description: "The sub-trades you've listed",
        enforcement: "page",
      },
      {
        kind: "toggle",
        key: "projects",
        label: "Project gallery",
        description: "Work photos, videos and before-and-afters",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "team",
        label: "Team members",
        description: "The people on your crew",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "faqs",
        label: "FAQs",
        description: "Common questions you've answered",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "capabilities",
        label: "Site-ready capabilities",
        description: "Gear, tickets and site credentials",
        enforcement: "page",
      },
      {
        kind: "toggle",
        key: "business_details",
        label: "Business details",
        description: "Trade, location, service area and reply time",
        enforcement: "page",
      },
    ],
  },
  {
    title: "Social proof & contact",
    rows: [
      {
        kind: "toggle",
        key: "reviews",
        label: "Reviews & rating",
        description: "Your star rating and written reviews",
        enforcement: "page",
      },
      {
        kind: "toggle",
        key: "contact",
        label: "Contact details",
        description: "Phone and email shown to signed-in visitors",
        enforcement: "view",
      },
    ],
  },
];

/* ── Enterprise (business) panel ─────────────────────────────────── */

export const ENTERPRISE_VISIBILITY_GROUPS: VisibilityGroup[] = [
  {
    title: "Verified credentials",
    rows: [
      {
        kind: "locked",
        label: "Verification status",
        description: "Your BLDESY verification badge",
      },
      {
        kind: "locked",
        label: "ABN & licence",
        description: "Business registration and licence number",
      },
      {
        kind: "locked",
        label: "Insurance",
        description: "Your listed insurance details",
      },
    ],
  },
  {
    title: "Company profile",
    rows: [
      {
        kind: "toggle",
        key: "about",
        label: "About",
        description: "Your company bio",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "specialties",
        label: "Specialities",
        description: "The project types you focus on",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "past_projects",
        label: "Past projects",
        description: "Completed project showcase",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "certifications",
        label: "Certifications",
        description: "Industry certifications you've listed",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "safety_record",
        label: "Safety record",
        description: "Your stated safety record",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "company_stats",
        label: "Company stats",
        description: "Years established, team size and active projects",
        enforcement: "view",
      },
    ],
  },
  {
    title: "Hiring",
    rows: [
      {
        kind: "toggle",
        key: "service_regions",
        label: "Service regions",
        description: "The regions you hire in",
        enforcement: "view",
      },
      {
        kind: "toggle",
        key: "trades_needed",
        label: "Trades you hire",
        description: "The trades you regularly need",
        enforcement: "view",
      },
      {
        kind: "locked",
        label: "Open positions",
        description: "Your live job posts — the point of the page",
      },
    ],
  },
  {
    title: "Contact",
    rows: [
      {
        kind: "toggle",
        key: "contact",
        label: "Contact details",
        description: "Phone and email shown to signed-in tradies",
        enforcement: "view",
      },
    ],
  },
];
