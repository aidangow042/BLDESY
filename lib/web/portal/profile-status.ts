// AUTO-SYNCED from ~/bldesy-web/lib/portal/profile-status.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * THE dashboard profile-status state machine (portal T5, Jul 2026).
 *
 * One card, five states, strict precedence:
 *   suspended > paused > pending > needs_attention > live
 *
 * Pure — no supabase, no Date.now side effects — so the whole matrix is
 * unit-testable (__tests__/portal-profile-status.test.ts). Callers derive the
 * input from the builder_profiles row + auth user and hand it over.
 *
 * The LISTING BAR (verified + service area + ≥1 photo) matches
 * meets_listing_bar in public_builder_profiles (migration 20260807) — the
 * needs_attention checklist exists to walk a tradie over exactly that bar.
 * Profile completeness (≥60%) is a NUDGE target only (locked decision
 * 28 Jul 2026): it never blocks listing, so it can't put the card into
 * needs_attention on its own — it surfaces as a nudge on the live card.
 */
import type { LaunchMode } from "@/lib/launch-flags";

export type PortalProfileState =
  | "suspended"
  | "paused"
  | "pending"
  | "needs_attention"
  | "live";

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  /** Deep link to the exact fix (edit-profile step, settings, …). */
  href: string;
}

export interface ProfileStatusInput {
  /** builder_profiles.status */
  status: string;
  /** builder_profiles.search_paused_at */
  searchPausedAt?: string | null;
  /** getProfileCompleteness() output, 0–100 */
  completeness: number;
  /** Account has an email address at all (phone-only accounts don't). */
  hasEmail: boolean;
  /** auth email confirmed — only meaningful when hasEmail. */
  emailVerified: boolean;
  /** builder_profiles.credentials_verified — all verification layers passed. */
  credentialsVerified: boolean;
  /** service_areas has at least one entry */
  hasServiceArea: boolean;
  /** profile photo or ≥1 display image */
  hasPhoto: boolean;
  launchMode: LaunchMode;
}

export interface ProfileStatusResult {
  state: PortalProfileState;
  headline: string;
  detail: string;
  /** needs_attention: the exact missing items, deep-linked. */
  checklist: ChecklistItem[];
  /** live-state nudges (completeness below target) — never blocking. */
  nudges: string[];
  /** Show the one-tap Pause / Go-live control (paused + live states). */
  showPauseControl: boolean;
}

/** Completeness nudge target — NOT a listing gate (locked decision). */
export const COMPLETENESS_NUDGE_TARGET = 60;

export function buildChecklist(input: ProfileStatusInput): ChecklistItem[] {
  const items: ChecklistItem[] = [
    {
      key: "verified",
      label: "Finish credential verification",
      done: input.credentialsVerified,
      href: "/portal/edit-profile?step=2",
    },
    {
      key: "service_area",
      label: "Set your service area",
      done: input.hasServiceArea,
      href: "/portal/edit-profile?step=1",
    },
    {
      key: "photo",
      label: "Add a profile photo",
      done: input.hasPhoto,
      href: "/portal/edit-profile?step=0",
    },
  ];
  if (input.hasEmail) {
    items.push({
      key: "email",
      label: "Verify your email address",
      done: input.emailVerified,
      href: "/portal/settings",
    });
  }
  return items;
}

export function derivePortalStatus(
  input: ProfileStatusInput,
): ProfileStatusResult {
  const waitlist = input.launchMode === "waitlist";
  const checklist = buildChecklist(input);
  const missing = checklist.filter((c) => !c.done);
  const nudges =
    input.completeness < COMPLETENESS_NUDGE_TARGET
      ? [
          `Your profile is ${input.completeness}% complete — the best-presented profiles get chosen first. Aim for ${COMPLETENESS_NUDGE_TARGET}%+.`,
        ]
      : [];

  // 1. Suspended — platform-initiated. Fail-closed default for any status
  //    that isn't a known-good one.
  if (input.status === "suspended" || input.status === "rejected") {
    return {
      state: "suspended",
      headline: "There's a problem with your profile",
      detail:
        "A credential check needs sorting before you can go back live. Upload the current document and we'll re-check it.",
      checklist: missing,
      nudges: [],
      showPauseControl: false,
    };
  }

  // 2. Paused — tradie-initiated, only ever set post-approval.
  if (input.searchPausedAt) {
    return {
      state: "paused",
      headline: "Profile offline — homeowners can't find you",
      detail:
        "You paused your profile. Your page is still online with a “not taking enquiries” note; go live again any time with one tap.",
      checklist: [],
      nudges: [],
      showPauseControl: true,
    };
  }

  // 3. Pending review.
  if (input.status === "pending_review") {
    return {
      state: "pending",
      headline: "We're checking your credentials",
      detail:
        "Usually done within 48 hours. We'll text and email you the moment you're approved — nothing else to do here.",
      checklist: [],
      nudges: [],
      showPauseControl: false,
    };
  }

  // Fail-closed: anything not explicitly approved/active from here is
  // treated as pending, never live.
  if (input.status !== "approved" && input.status !== "active") {
    return {
      state: "pending",
      headline: "We're checking your profile",
      detail: "We'll be in touch the moment it's sorted.",
      checklist: [],
      nudges: [],
      showPauseControl: false,
    };
  }

  // 4. Needs sorting — approved but under the listing bar (or unverified
  //    email). These are the exact items keeping them out of search.
  if (missing.length > 0) {
    return {
      state: "needs_attention",
      headline: "Your profile isn't ready for homeowners yet",
      detail: waitlist
        ? "Knock these over before launch and homeowners see you from day one:"
        : "Knock these over and you'll show up in search:",
      checklist: missing,
      nudges,
      showPauseControl: false,
    };
  }

  // 5. Live.
  return {
    state: "live",
    headline: waitlist
      ? "You're on the launch roster"
      : "Your profile is live",
    detail: waitlist
      ? "Your profile is ready — homeowners see you the day your area switches on. Your area goes live when enough verified tradies are ready."
      : "Homeowners can find you in search right now.",
    checklist: [],
    nudges,
    showPauseControl: true,
  };
}
