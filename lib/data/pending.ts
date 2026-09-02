/**
 * lib/data/pending.ts — the /portal/pending state machine.
 *
 * Port of ~/bldesy-web/app/portal/pending/page.tsx:
 *   resolvePendingAction()  — verbatim, the approved-tradie decision shared by the
 *                             redirect effect and the render so they can never drift
 *   derivePendingAction()   — the page's full render order flattened to one value
 *   the 5s verification poll (shouldPollVerification / verificationProgressed)
 *   ScoreRevealCard inputs  — bldesy_score + bldesy_score_breakdown from the OWN
 *                             builder_profiles row (the page does not read quality_reviews)
 *   improvementTips()       — components/portal/score-reveal-card.tsx, verbatim strings
 *
 * The card-step flag comes from GET /api/billing/card-setup (lib/data/billing
 * fetchCardStepEnabled). "Retry verification" (autoVerifyBuilder +
 * fireQualityReview) is a website server action with no API route — the app
 * hands off to the web wizard via lib/web-onboarding.ts instead.
 */
import { db } from '@/lib/supabase';
import type {
  BldesyReviewStatus,
  BldesyScoreBreakdown,
  BldesyScoreItem,
  BuilderStatus,
  PlanState,
} from '@/types/database';

import { requireUserId } from './own-session';

/* ── Row ────────────────────────────────────────────────────────────── */

export const PENDING_ROW_COLUMNS = [
  'status',
  'rejection_reason',
  'stripe_subscription_id',
  'trade_category',
  'trade_categories',
  'bldesy_review_status',
  'email',
  'phone',
  'plan_state',
  'card_on_file_at',
  'bldesy_score',
  'bldesy_score_breakdown',
] as const;

export const PENDING_ROW_SELECT: string = PENDING_ROW_COLUMNS.join(', ');

export interface PendingBuilderRow {
  status: BuilderStatus;
  rejection_reason: string | null;
  stripe_subscription_id: string | null;
  trade_category: string;
  trade_categories: string[] | null;
  bldesy_review_status: BldesyReviewStatus | null;
  email: string | null;
  phone: string | null;
  plan_state: PlanState | null;
  card_on_file_at: string | null;
  bldesy_score: number | null;
  bldesy_score_breakdown: BldesyScoreBreakdown | null;
}

/** The pending page's own-row read; null = no builder profile yet (→ join wizard). */
export async function getPendingRow(userId?: string): Promise<PendingBuilderRow | null> {
  const uid = userId ?? (await requireUserId());
  const { data, error } = await db
    .from('builder_profiles')
    .select(PENDING_ROW_SELECT)
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PendingBuilderRow | null) ?? null;
}

/* ── Decision (verbatim) ────────────────────────────────────────────── */

export type ApprovedPendingAction = 'activate' | 'card_step' | 'await_flag' | 'plan_picker' | 'portal' | null;

/** The auth facts the decision reads off the Supabase user. */
export interface PendingUserFacts {
  is_anonymous?: boolean;
  email?: string;
  phone?: string;
}

/**
 * Single source for "what does an APPROVED tradie do on this page?"
 *
 *   activate     anonymous account: verify contact first
 *   card_step    value-gated free, no card, flag ON → CardSetupCard
 *   await_flag   same, but the flag fetch hasn't resolved yet → hold
 *   plan_picker  legacy NULL plan_state without a sub → PlanPicker
 *   portal       nothing to do here — INCLUDING grace/active rows with a
 *                live subscription (status stays 'approved' under the
 *                value-gated model)
 *   null         legacy NULL row WITH a sub (pre-vg mid-checkout edge):
 *                falls through to the historical screens
 */
export function resolvePendingAction(
  row: Pick<PendingBuilderRow, 'plan_state' | 'stripe_subscription_id' | 'card_on_file_at'>,
  user: PendingUserFacts | null,
  cardStepEnabled: boolean | null,
): ApprovedPendingAction {
  if (user?.is_anonymous === true && !user.email && !user.phone) return 'activate';
  if (row.plan_state == null) {
    return row.stripe_subscription_id ? null : 'plan_picker';
  }
  if (row.stripe_subscription_id) return 'portal';
  if (row.plan_state !== 'free' || row.card_on_file_at) return 'portal';
  if (cardStepEnabled === true) return 'card_step';
  if (cardStepEnabled === null) return 'await_flag';
  return 'portal'; // flag OFF pre-launch — the card comes later via the cron window
}

/**
 * The whole page, flattened, in the website's render order:
 *
 *   portal       status active → straight to /portal
 *   suspended    "Account Suspended" + contact support
 *   activate | card_step | await_flag | plan_picker | portal
 *                status approved — see resolvePendingAction (portal = redirect)
 *   declined     quietly declined after a quality flag (no reason, no retry)
 *   rejected     rejection_reason set or status rejected — reason + retry/edit
 *   flagged      passed verification, held for a final human review
 *   verifying    pending_review, no reason — auto-refreshing
 */
export type PendingAction =
  | 'portal'
  | 'suspended'
  | 'activate'
  | 'card_step'
  | 'await_flag'
  | 'plan_picker'
  | 'declined'
  | 'rejected'
  | 'flagged'
  | 'verifying';

export function derivePendingAction(
  row: PendingBuilderRow,
  user: PendingUserFacts | null,
  cardStepEnabled: boolean | null,
): PendingAction {
  if (row.status === 'active') return 'portal';
  if (row.status === 'suspended') return 'suspended';
  if (row.status === 'approved') {
    const action = resolvePendingAction(row, user, cardStepEnabled);
    if (action) return action;
    // legacy NULL plan_state WITH a sub → the historical screens below
  }
  if (row.bldesy_review_status === 'declined') return 'declined';
  if (row.rejection_reason || row.status === 'rejected') return 'rejected';
  if (row.bldesy_review_status === 'flagged') return 'flagged';
  return 'verifying';
}

/** The trades the card step / plan picker resolve a tier from. */
export function pendingTradesFor(row: Pick<PendingBuilderRow, 'trade_category' | 'trade_categories'>): string[] {
  return row.trade_categories && row.trade_categories.length > 0
    ? row.trade_categories
    : row.trade_category
      ? [row.trade_category]
      : [];
}

/* ── Verification poll ──────────────────────────────────────────────── */

/** The website re-reads the row every 5s while verifying. */
export const VERIFY_POLL_MS = 5000;

/** Poll only while pending_review with no rejection reason. */
export function shouldPollVerification(row: Pick<PendingBuilderRow, 'status' | 'rejection_reason'>): boolean {
  return row.status === 'pending_review' && !row.rejection_reason;
}

/** Did a poll move the UI on? (status, reason, or quality-review sub-state changed) */
export function verificationProgressed(
  prev: Pick<PendingBuilderRow, 'status' | 'rejection_reason' | 'bldesy_review_status'>,
  next: Pick<PendingBuilderRow, 'status' | 'rejection_reason' | 'bldesy_review_status'> | null,
): boolean {
  return (
    !!next &&
    (next.status !== prev.status ||
      !!next.rejection_reason ||
      next.bldesy_review_status !== prev.bldesy_review_status)
  );
}

/* ── Score reveal (components/portal/score-reveal-card.tsx) ─────────── */

export interface ScoreTip {
  key: string;
  text: string;
  /** Website route to the fix, or null when it's automatic. */
  href: string | null;
}

export interface ScoreReveal {
  /** 0–100 */
  score: number;
  breakdown: BldesyScoreBreakdown | null;
  tips: ScoreTip[];
}

const REPUTATION_TIP: ScoreTip = {
  key: 'reputation',
  text: 'Grow your Google reviews — your reputation score is worth up to 30 pts and rises as verified work comes in.',
  href: null,
};

/** Actionable copy per improvable breakdown item; unknown keys are skipped. */
export function improvementTips(breakdown: BldesyScoreBreakdown): ScoreTip[] {
  const tips: ScoreTip[] = [];
  for (const item of breakdown.verification) {
    if (item.points >= item.max) continue;
    if (item.key === 'insurance') {
      tips.push({
        key: item.key,
        text: `Verify your public liability insurance — +${item.max} pts and a trust badge customers look for.`,
        href: '/portal/edit-profile',
      });
    } else if (item.key === 'gst_registered') {
      tips.push({
        key: item.key,
        text: `+${item.max} pts once your ABN shows GST registration — picked up automatically from the ABR.`,
        href: null,
      });
    } else if (item.key === 'years_in_business') {
      tips.push({
        key: item.key,
        text: `Up to ${item.max} pts as your ABN matures — credited automatically at 2 and 5 years active.`,
        href: null,
      });
    }
  }
  // Reputation renders as ONE aggregate nudge, not a row per sub-item.
  if (breakdown.reputation.some((i: BldesyScoreItem) => i.points < i.max)) {
    tips.push(REPUTATION_TIP);
  }
  return tips;
}

/**
 * The tradie's OWN score view (unrelated to the public display_bldesy_score
 * opt-in). Null when no score has been computed yet — the card is not shown.
 */
export function scoreRevealFrom(
  row: Pick<PendingBuilderRow, 'bldesy_score' | 'bldesy_score_breakdown'>,
): ScoreReveal | null {
  if (row.bldesy_score == null) return null;
  const score = Math.max(0, Math.min(100, row.bldesy_score));
  return {
    score,
    breakdown: row.bldesy_score_breakdown,
    tips: row.bldesy_score_breakdown ? improvementTips(row.bldesy_score_breakdown) : [],
  };
}

/** Read + derive the score reveal for the signed-in tradie. */
export async function getScoreReveal(): Promise<ScoreReveal | null> {
  const row = await getPendingRow();
  return row ? scoreRevealFrom(row) : null;
}
