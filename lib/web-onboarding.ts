/**
 * web-onboarding — hands a logged-in app user off to the website's builder /
 * enterprise registration, already authenticated (no second login).
 *
 * Why web: builder onboarding is a heavy, one-time, document-heavy flow
 * (trade + subtrade, insurance upload + AI scan, credential verification).
 * It lives on the website where it's maintained in one place; the app opens
 * it in an in-app browser rather than duplicating the form natively.
 *
 * How the session crosses over: we read the current Supabase session and pass
 * the access + refresh tokens to `/auth/app-bridge` in the URL *fragment*
 * (never sent to the server, so it stays out of logs). The bridge page calls
 * `setSession()` and forwards to the right signup page. If there's no session
 * we just open the public page and the web prompts for login.
 */

import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// www host directly — the apex 307-redirects to www and the in-app browser
// drops the token fragment across that redirect, landing the user logged out.
const WEB_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bldesy.com.au';

export type OnboardingTarget = 'builder' | 'enterprise';

const DEST: Record<OnboardingTarget, string> = {
  builder: 'become-a-builder',
  enterprise: 'list-company',
};

/**
 * Open the website registration flow for the given target. Resolves once the
 * in-app browser is dismissed.
 */
export async function openWebOnboarding(target: OnboardingTarget): Promise<void> {
  const dest = DEST[target];

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let url: string;
  if (session?.access_token && session?.refresh_token) {
    const fragment = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      next: dest,
    }).toString();
    url = `${WEB_BASE}/auth/app-bridge#${fragment}`;
  } else {
    // Not logged in — open the public page; the website handles auth.
    url = `${WEB_BASE}/${dest}`;
  }

  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
  });
}
