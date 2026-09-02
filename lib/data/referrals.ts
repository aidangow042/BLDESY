/**
 * lib/data/referrals.ts — tradie Refer & Earn.
 *
 * Port of:
 *   ~/bldesy-web/lib/actions/referrals.ts      (getMyReferralSummary, validateReferralCode)
 *   ~/bldesy-web/lib/referrals/types.ts        (ReferralSummary / ReferralRowSummary — verbatim)
 *   ~/bldesy-web/lib/referrals/format.ts       (formatCents, buildReferralSharePayload — verbatim)
 *   ~/bldesy-web/lib/referrals/validate.ts     (normaliseReferralCode — verbatim)
 *   ~/bldesy-web/components/referrals/referral-code-card.tsx (share/copy flow the screen ports)
 *
 * Routes (website, being added alongside this module):
 *   GET  /api/me/referrals            → ReferralSummary | null  (the action's return, as-is)
 *   POST /api/referrals/validate      { code } → { valid: boolean }
 *
 * The summary is assembled server-side with the service-role client (the
 * attribution tables have no RLS policies and referred names arrive
 * pre-masked) — the app never reads signup_codes / signup_attributions.
 */
import { api } from '@/lib/api';
import { CODE_LENGTH, CODE_PREFIX, CODE_REGEX } from '@/lib/web/referrals/config';
import type { SignupAttributionStatus } from '@/types/database';

export interface ReferralRowSummary {
  /** First name + last initial only ("Jake T.") — masked server-side, never full PII. */
  name: string;
  status: Exclude<SignupAttributionStatus, 'rejected'>;
  /** ISO timestamp the mate signed up. */
  date: string;
}

export interface ReferralSummary {
  /** Null until the tradie is verified — referral surfaces render nothing. */
  code: string | null;
  /** `${origin}/join?ref=CODE` — prefills the wizard field via the bld_ref cookie. */
  shareUrl: string | null;
  /** Everything except rejected rows (gaming attempts are admin-only). */
  matesJoined: number;
  /** verified + paid. */
  verifiedCount: number;
  /** verified + paid — "earned" the moment the mate is verified. */
  earnedCents: number;
  /** verified but not yet paid out. */
  pendingCents: number;
  paidCents: number;
  rows: ReferralRowSummary[];
}

/**
 * Everything the tradie-facing referral surfaces render. Null when the route
 * has nothing for this account (not signed in / server error) — the website
 * action returns null in the same cases and the card renders nothing.
 */
export async function getMyReferralSummary(): Promise<ReferralSummary | null> {
  try {
    const res = await api.get<ReferralSummary | null>('/api/me/referrals');
    return res ?? null;
  } catch {
    return null;
  }
}

/**
 * Soft inline feedback for a code field: does this code exist and is it
 * active? Validity ONLY — never the owner's identity. Failures read as
 * invalid, matching the website action's catch.
 */
export async function validateReferralCode(raw: string): Promise<{ valid: boolean }> {
  const code = normaliseReferralCode(raw);
  if (!code) return { valid: false };
  try {
    const res = await api.post<{ valid?: boolean }>('/api/referrals/validate', { code });
    return { valid: res?.valid === true };
  } catch {
    return { valid: false };
  }
}

/* ── Pure helpers (verbatim ports) ──────────────────────────────────── */

/**
 * Normalise user-typed code input to canonical `BLD-XXXXX` form, or null if
 * it can't be one. Accepts lowercase, stray whitespace, and the bare 5-char
 * body without the prefix ("7xk4q" → "BLD-7XK4Q").
 */
export function normaliseReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let code = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!code) return null;
  if (!code.startsWith(CODE_PREFIX) && code.length === CODE_LENGTH) {
    code = CODE_PREFIX + code;
  }
  return CODE_REGEX.test(code) ? code : null;
}

/** "$20" for whole dollars, "$20.50" otherwise. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/**
 * The share-sheet payload for a tradie's referral code — pure so the exact
 * text/url a mate receives is pinned by a unit test (website P2.5).
 */
export function buildReferralSharePayload(
  code: string,
  shareUrl: string,
): { text: string; url: string } {
  return {
    text: `Get on BLDESY — use my code ${code} when you sign up.`,
    url: shareUrl,
  };
}

/** The share sheet's single message (RN Share takes one string). */
export function referralShareMessage(code: string, shareUrl: string): string {
  const { text, url } = buildReferralSharePayload(code, shareUrl);
  return `${text} ${url}`;
}
