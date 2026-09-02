// AUTO-SYNCED from ~/bldesy-web/lib/profile-completeness.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * THE profile-completeness calculation — one weighted formula shared by the
 * portal dashboard ring/tile, the Analytics page and the status-card
 * checklist (they previously ran different check lists and disagreed on the
 * same profile).
 *
 * Normalised against the total weight so 100% is reachable whatever the
 * weights sum to.
 *
 * P2.6: every check carries a label + the edit-profile wizard step it lives
 * on, so any surface can render the SAME deep-linked checklist
 * (completenessChecklist below). Email verification counts toward the score
 * when the caller can supply it (auth-side fact — pass via extras; all
 * portal surfaces do, so the number agrees everywhere).
 */

interface ProfileCheck {
  field: string;
  weight: number;
  minLength?: number;
  isArray?: boolean;
  /** Human label for checklist rendering. */
  label: string;
  /** Edit-profile wizard step (0-5) the fix lives on; null → settings. */
  step: number | null;
}

export const PROFILE_COMPLETENESS_CHECKS: ProfileCheck[] = [
  { field: "bio", weight: 10, minLength: 50, label: "Write a bio (50+ characters)", step: 0 },
  { field: "profile_photo_url", weight: 10, label: "Add a profile photo", step: 0 },
  { field: "projects", weight: 10, isArray: true, label: "Show off a past project", step: 4 },
  { field: "phone", weight: 5, label: "Add a contact number", step: 0 },
  { field: "website", weight: 5, label: "Add your website", step: 0 },
  { field: "cover_photo_url", weight: 5, label: "Add a cover photo", step: 0 },
  { field: "abn", weight: 5, label: "Add your ABN", step: 2 },
  { field: "license_key", weight: 5, label: "Add your licence", step: 2 },
  { field: "team_members", weight: 3, isArray: true, label: "Introduce your team", step: 5 },
  { field: "faqs", weight: 2, isArray: true, label: "Answer common questions (FAQs)", step: 5 },
  { field: "business_name", weight: 10, label: "Add your business name", step: 0 },
  { field: "trade_category", weight: 10, label: "Set your trade", step: 1 },
  { field: "suburb", weight: 5, label: "Set your home suburb", step: 1 },
  { field: "email", weight: 5, label: "Add an email address", step: 0 },
];

/** Auth-side extras — facts the profile row can't know. */
export interface CompletenessExtras {
  /** Email confirmed in auth. Omit for accounts with no email (phone-only). */
  emailVerified?: boolean;
}

/** Weight of the email-verified check when the caller supplies it. */
const EMAIL_VERIFIED_WEIGHT = 5;

/** Columns a caller must select from builder_profiles to run the calc. */
export const PROFILE_COMPLETENESS_COLUMNS = PROFILE_COMPLETENESS_CHECKS.map(
  (c) => c.field,
).join(", ");

const BASE_TOTAL_WEIGHT = PROFILE_COMPLETENESS_CHECKS.reduce(
  (sum, c) => sum + c.weight,
  0,
);

function checkPassed(profile: Record<string, unknown>, c: ProfileCheck): boolean {
  const val = profile[c.field] as string | unknown[] | null | undefined;
  return c.isArray
    ? Array.isArray(val) && val.length > 0
    : c.minLength
      ? typeof val === "string" && val.length >= c.minLength
      : !!val;
}

export function getProfileCompleteness(
  profile: Record<string, unknown>,
  extras?: CompletenessExtras,
): number {
  let score = 0;
  for (const c of PROFILE_COMPLETENESS_CHECKS) {
    if (checkPassed(profile, c)) score += c.weight;
  }
  let total = BASE_TOTAL_WEIGHT;
  if (extras && typeof extras.emailVerified === "boolean") {
    total += EMAIL_VERIFIED_WEIGHT;
    if (extras.emailVerified) score += EMAIL_VERIFIED_WEIGHT;
  }
  return Math.round((score / total) * 100);
}

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  /** Deep link to the fix. */
  href: string;
}

/**
 * The full deep-linked checklist behind the % — missing items first,
 * heaviest first, so every surface renders the same priorities.
 */
export function completenessChecklist(
  profile: Record<string, unknown>,
  extras?: CompletenessExtras,
): CompletenessItem[] {
  const items: CompletenessItem[] = PROFILE_COMPLETENESS_CHECKS.map((c) => ({
    key: c.field,
    label: c.label,
    done: checkPassed(profile, c),
    weight: c.weight,
    href: c.step === null ? "/portal/settings" : `/portal/edit-profile?step=${c.step}`,
  }));
  if (extras && typeof extras.emailVerified === "boolean") {
    items.push({
      key: "email_verified",
      label: "Verify your email address",
      done: extras.emailVerified,
      weight: EMAIL_VERIFIED_WEIGHT,
      href: "/portal/settings",
    });
  }
  return items.sort(
    (a, b) => Number(a.done) - Number(b.done) || b.weight - a.weight,
  );
}
