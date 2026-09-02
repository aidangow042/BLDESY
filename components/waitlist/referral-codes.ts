/**
 * Homeowner waitlist referral (MATE-) codes — app copy of
 * ~/bldesy-web/lib/waitlist/referral-codes.ts (not in the sync mirror).
 *
 * Two deliberate adaptations, both environment-only:
 *   - `@/lib/referrals/config` → `@/lib/web/referrals/config` (the mirror path)
 *   - the share origin is `WEB_BASE` (the app's website host) rather than the
 *     website's NEXT_PUBLIC_* env vars.
 * Everything else — prefix, regex, cap, normaliser — is byte-for-byte the web.
 */
import { WEB_BASE } from '@/lib/routes';
import { CODE_ALPHABET, CODE_LENGTH } from '@/lib/web/referrals/config';

export const MATE_CODE_PREFIX = 'MATE-';
export const MATE_CODE_REGEX = new RegExp(`^${MATE_CODE_PREFIX}[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Max bonus draw entries one person can earn from referrals. */
export const REFERRAL_BONUS_CAP = 5;

export function bonusEntries(creditedCount: number): number {
  return Math.max(0, Math.min(REFERRAL_BONUS_CAP, creditedCount));
}

/**
 * Normalise user-supplied code input to canonical `MATE-XXXXX`, or null.
 * Accepts lowercase, stray whitespace, and the bare 5-char body without
 * the prefix ("7xk4q" → "MATE-7XK4Q") — same forgiveness as the tradie
 * normaliser.
 */
export function normaliseMateCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let code = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!code) return null;
  if (!code.startsWith(MATE_CODE_PREFIX) && code.length === CODE_LENGTH) {
    code = MATE_CODE_PREFIX + code;
  }
  return MATE_CODE_REGEX.test(code) ? code : null;
}

/** The share link a joiner sends a mate — lands on the website's /waitlist. */
export function buildMateShareUrl(code: string): string {
  return `${WEB_BASE}/waitlist?mate=${encodeURIComponent(code)}`;
}
