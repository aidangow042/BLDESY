/**
 * Pure URL construction for the app → website onboarding hand-off. No React
 * Native / Supabase imports so vitest can exercise it; `lib/web-onboarding.ts`
 * reads the session and opens the browser.
 *
 * The session crosses over via `/auth/app-bridge` with the tokens in the URL
 * FRAGMENT — never the query — so they stay out of server and proxy logs (the
 * fragment is never sent to the server). The bridge calls `setSession()` and
 * forwards to `next`.
 */

export type OnboardingTarget = 'builder' | 'enterprise' | 'enterprise-waitlist';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** Website page each target lands on when no explicit `next` is given. */
export const ONBOARDING_DEFAULT_NEXT: Record<Exclude<OnboardingTarget, 'enterprise-waitlist'>, string> = {
  // The website 308s the legacy `become-a-builder` slug; use the live one.
  builder: 'join-as-a-tradie',
  enterprise: 'list-company',
};

/** The live hiring waitlist — opened directly, no bridge (public page). */
export const ENTERPRISE_WAITLIST_PATH = 'for-builders/waitlist';

/**
 * Resolve the website path (no leading slash) the hand-off should end on.
 * An explicit `next` always wins; otherwise the builder target forwards a
 * pending referral code as `join?ref=CODE` (the website's own share-link
 * landing, which drops the `bld_ref` cookie before the wizard) and falls back
 * to the target's default page.
 */
export function resolveOnboardingNext(
  target: OnboardingTarget,
  next?: string | null,
  referralCode?: string | null,
): string {
  if (target === 'enterprise-waitlist') return ENTERPRISE_WAITLIST_PATH;
  if (next) return next.replace(/^\/+/, '');
  if (target === 'builder' && referralCode) {
    return `join?ref=${encodeURIComponent(referralCode)}`;
  }
  return ONBOARDING_DEFAULT_NEXT[target];
}

/**
 * Build the URL to open. With a session the bridge URL carries the tokens and
 * `next` in the fragment; without one (or for the public waitlist) the page is
 * opened directly and the website prompts for login where it needs to.
 */
export function buildOnboardingUrl(
  base: string,
  target: OnboardingTarget,
  next: string,
  tokens: SessionTokens | null,
): string {
  const root = base.replace(/\/+$/, '');
  if (target === 'enterprise-waitlist' || !tokens) {
    return `${root}/${next}`;
  }
  const fragment = new URLSearchParams({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    next,
  }).toString();
  return `${root}/auth/app-bridge#${fragment}`;
}
