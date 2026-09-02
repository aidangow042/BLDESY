/**
 * web-onboarding — hands an app user off to the website, already
 * authenticated (no second login).
 *
 * Why web: tradie onboarding + credential verification is a heavy, one-time,
 * document-heavy flow (trade + subtrade, insurance upload + AI scan, licence
 * checks). It lives on the website where it's maintained in one place; the app
 * opens it in an in-app browser rather than duplicating the wizard (CLAUDE.md
 * §7). The same bridge resumes a pending application, opens billing, etc.
 *
 * How the session crosses over: we read the current Supabase session and pass
 * the access + refresh tokens to `/auth/app-bridge` in the URL *fragment*
 * (never the query — the fragment is never sent to the server, so it stays out
 * of logs). The bridge calls `setSession()` and forwards to `next`. With no
 * session we open `${WEB_BASE}/${next}` directly and the website prompts for
 * login where it needs to.
 *
 * URL construction is pure and unit-tested in `lib/auth/onboarding-url.ts`.
 */

import * as WebBrowser from 'expo-web-browser';

import {
  buildOnboardingUrl,
  resolveOnboardingNext,
  type OnboardingTarget,
  type SessionTokens,
} from '@/lib/auth/onboarding-url';
import { readPendingReferralCode } from '@/lib/auth/referral-code';
import { WEB_BASE } from '@/lib/routes';

import { supabase } from './supabase';

export type { OnboardingTarget } from '@/lib/auth/onboarding-url';

/**
 * Open the website for `target`. Resolves once the in-app browser is dismissed.
 *
 *   - `'builder'`             → `join-as-a-tradie` (or `join?ref=CODE` when a
 *                               referral code is pending)
 *   - `'enterprise'`          → `list-company`
 *   - `'enterprise-waitlist'` → the public `for-builders/waitlist` page, opened
 *                               directly (no bridge needed)
 *
 * `next` overrides the destination for the first two, e.g. `'portal/pending'`,
 * `'portal/edit-profile?step=2'`, `'portal/billing'`, `'enterprise/pending'`.
 */
export async function openWebOnboarding(target: OnboardingTarget, next?: string): Promise<void> {
  const referralCode = target === 'builder' && !next ? await readPendingReferralCode() : null;
  const dest = resolveOnboardingNext(target, next, referralCode);

  let tokens: SessionTokens | null = null;
  if (target !== 'enterprise-waitlist') {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token && session?.refresh_token) {
      tokens = { accessToken: session.access_token, refreshToken: session.refresh_token };
    }
  }

  await WebBrowser.openBrowserAsync(buildOnboardingUrl(WEB_BASE, target, dest, tokens), {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
  });
}
