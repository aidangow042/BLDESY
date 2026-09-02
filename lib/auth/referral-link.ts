/**
 * Pure referral-link helpers — the app twin of the website's
 * `app/join/route.ts` + `lib/referrals/validate.ts`. No React Native imports
 * so vitest can exercise them directly; storage lives in
 * `lib/auth/referral-code.ts`.
 *
 * The website's share link is `/join?ref=BLD-7XK4Q`. The app receives it as
 *   - `bldesy://join?ref=BLD-7XK4Q`            (production scheme)
 *   - `https://www.bldesy.com.au/join?ref=…`    (universal link)
 *   - `exp://192.168.1.5:8081/--/join?ref=…`    (dev client)
 *   - `bldesy://signup?ref=…`                   (straight into the signup screen)
 */
import { CODE_LENGTH, CODE_PREFIX, CODE_REGEX } from '@/lib/web/referrals/config';

/**
 * Normalise user-typed / URL-borne code input to canonical `BLD-XXXXX` form,
 * or null if it can't be one. Mirrors the website's normaliseReferralCode:
 * accepts lowercase, stray whitespace, and the bare 5-char body without the
 * prefix ("7xk4q" → "BLD-7XK4Q").
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

/** Paths (without leading slash) that may carry a referral code. */
const REFERRAL_PATHS = new Set(['join', 'signup']);

/**
 * Path of an incoming link with scheme/host quirks removed:
 *   bldesy://join?ref=x            → "join"
 *   bldesy:///join?ref=x           → "join"
 *   exp://host:port/--/join?ref=x  → "join"
 *   https://host/join?ref=x        → "join"
 */
function deepLinkPath(url: string): string | null {
  const noQuery = url.split(/[?#]/)[0] ?? '';
  const schemeEnd = noQuery.indexOf('://');
  if (schemeEnd === -1) return null;
  const scheme = noQuery.slice(0, schemeEnd).toLowerCase();
  let rest = noQuery.slice(schemeEnd + 3);

  const devMarker = rest.indexOf('/--/');
  if (devMarker !== -1) {
    // Expo dev-client link: the app path follows `/--/`.
    rest = rest.slice(devMarker + 4);
  } else if (scheme === 'http' || scheme === 'https') {
    // Universal link: drop the host.
    const slash = rest.indexOf('/');
    rest = slash === -1 ? '' : rest.slice(slash + 1);
  }
  // Custom scheme: `bldesy://join` puts the path in the host position and
  // `bldesy:///join` leaves an empty host — both just need leading slashes gone.
  rest = rest.replace(/^\/+/, '');

  // Ignore expo-router group segments such as "(auth)".
  const segments = rest.split('/').filter((s) => s && !/^\(.*\)$/.test(s));
  return segments.length ? segments.join('/') : null;
}

/**
 * Pull a referral code out of an incoming link. Returns the canonical code, or
 * null when the link isn't a referral landing (`/join` or `/signup`) or the
 * code doesn't validate. Regex validation only — the website re-validates
 * against the database at submit, exactly as its own /join route does.
 */
export function parseReferralDeepLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = deepLinkPath(url);
  if (!path || !REFERRAL_PATHS.has(path)) return null;

  const q = url.indexOf('?');
  if (q === -1) return null;
  const query = url.slice(q + 1).split('#')[0] ?? '';
  return normaliseReferralCode(new URLSearchParams(query).get('ref'));
}
