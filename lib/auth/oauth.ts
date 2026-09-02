/**
 * Google sign-in → Supabase session, via a browser auth session.
 *
 * The website's Google button calls `signInWithOAuth` and lets the browser
 * follow the redirect to `/auth/callback`. The app can't follow a redirect, so
 * it asks Supabase for the provider URL (`skipBrowserRedirect`), opens it in
 * an `ASWebAuthenticationSession` / Custom Tab, and waits for the round trip
 * to land back on `bldesy://auth/callback`. The returned URL carries either a
 * PKCE `code` (→ exchangeCodeForSession) or the implicit-flow token pair in
 * the fragment (→ setSession); `parseOAuthCallbackUrl` tells them apart.
 *
 * Routing after the session lands is the root layout's job — callers must not
 * navigate themselves.
 *
 * SETUP (one-time, outside code): Supabase → Authentication → URL
 * Configuration → Redirect URLs must include `bldesy://auth/callback`, or
 * Supabase refuses the redirect and the browser lands on an error page.
 */
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

import { parseOAuthCallbackUrl } from './oauth-callback';

export const OAUTH_REDIRECT_URL = 'bldesy://auth/callback';

export type OAuthResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const NETWORK_ERROR = 'Network error. Please try again.';

export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error) return { status: 'error', message: error.message };
    if (!data.url) return { status: 'error', message: NETWORK_ERROR };

    const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL);
    if (result.type !== 'success') return { status: 'cancelled' };

    const callback = parseOAuthCallbackUrl(result.url);
    if (!callback) return { status: 'cancelled' };
    if (callback.kind === 'error') {
      return { status: 'error', message: callback.description ?? callback.error };
    }

    const { error: sessionError } =
      callback.kind === 'tokens'
        ? await supabase.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          })
        : await supabase.auth.exchangeCodeForSession(callback.code);
    if (sessionError) return { status: 'error', message: sessionError.message };

    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e instanceof Error && e.message ? e.message : NETWORK_ERROR };
  }
}
