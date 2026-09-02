// AUTO-SYNCED from ~/bldesy-web/lib/billing/plan-state.ts by scripts/sync-web-libs.mjs — DO NOT EDIT HERE.
// Change the website original, then run: npm run sync:web

/**
 * Pure plan-state predicates — the single TypeScript source of truth for what
 * each value-gated billing state may do. Server routes, the portal shell and
 * the billing page all read these; the unit-test matrix in
 * __tests__/billing-plan-state.test.ts pins every row.
 *
 * ⚠ acceptsNewEnquiries() has an SQL twin: the accepting_enquiries column of
 * public_builder_profiles (supabase/migrations/20260723, tradie pause folded
 * in by 20260807). If you change the predicate here, change the view too.
 *
 * No "server-only": pure functions, shared with unit tests + client UI.
 */
import { CARD_WINDOW_DAYS, MS_PER_DAY } from "@/lib/web/billing/config";
import type { BuilderStatus, PlanState } from "@/types/database";

export interface AcceptingFields {
  plan_state: PlanState | null;
  card_on_file_at: string | null;
  card_required_at: string | null;
  /**
   * Tradie-initiated pause (migration 20260807). Optional so pre-pause
   * callers/tests keep compiling — omitting it means "not paused".
   */
  search_paused_at?: string | null;
}

/** End of the add-a-card window, or null when no window is open. */
export function cardWindowDeadline(
  cardRequiredAt: string | null,
): Date | null {
  if (!cardRequiredAt) return null;
  const stamped = new Date(cardRequiredAt);
  if (Number.isNaN(stamped.getTime())) return null;
  return new Date(stamped.getTime() + CARD_WINDOW_DAYS * MS_PER_DAY);
}

/**
 * May this tradie receive NEW inbound enquiries (EOI, new conversations) and
 * appear in discovery (search, map, trade landings, sitemap, job-match)?
 *
 * false when the tradie paused their own profile, when billing-paused, or
 * when free with no card and the 7-day card window has elapsed. Everything
 * else — founding_free, grace, active, past_due (full access during dunning),
 * free-with-card, free-unstamped, free-inside-window, and legacy NULL —
 * accepts.
 */
export function acceptsNewEnquiries(
  fields: AcceptingFields,
  now: Date = new Date(),
): boolean {
  if (fields.search_paused_at) return false;
  if (fields.plan_state === "paused") return false;
  if (fields.plan_state === "free" && !fields.card_on_file_at) {
    const deadline = cardWindowDeadline(fields.card_required_at);
    if (deadline && deadline.getTime() < now.getTime()) return false;
  }
  return true;
}

export interface PortalAccessFields {
  status: BuilderStatus;
  plan_state: PlanState | null;
}

/**
 * May this tradie use /portal/* (beyond /portal/pending)?
 *
 * Value-gated model: every approved tradie gets the portal — free/grace need
 * their leads and meter, past_due needs the update-card path, paused needs
 * billing + open conversations. status keeps gating the approval pipeline
 * (pending_review / rejected / suspended stay out). Legacy NULL plan_state
 * (pre-migration row) keeps the old paid-only rule.
 */
export function hasPortalAccess(fields: PortalAccessFields): boolean {
  if (fields.status === "active") return true;
  if (fields.status === "approved") return fields.plan_state != null;
  return false;
}

/**
 * Can this row ever enter the billing machine? founding_free (the manual
 * grandfather) and legacy NULL rows are never billable — THE founding
 * invariant. assertBillable() and every webhook/cron guard call this, so the
 * rule has exactly one definition.
 */
export function isBillable(fields: { plan_state: PlanState | null }): boolean {
  return fields.plan_state != null && fields.plan_state !== "founding_free";
}

export interface ContactLockFields {
  status: BuilderStatus;
  plan_state: PlanState | null;
}

/**
 * Should lead contact details (email/phone) be withheld from this tradie?
 *
 * Value-gated model: NEVER — full lead contact access is the free product;
 * the paid thing is continued lead flow after 3 contacts. Paused tradies
 * receive no NEW leads at all (blocked upstream by acceptsNewEnquiries), so
 * no lock is needed there either. Legacy NULL plan_state keeps the old
 * "subscribe to see details" teaser (status !== 'active').
 */
export function isLeadContactLocked(fields: ContactLockFields): boolean {
  if (fields.plan_state != null) return false;
  return fields.status !== "active";
}
