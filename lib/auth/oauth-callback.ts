/**
 * Pure parser for the URL Supabase redirects to after a browser OAuth round
 * trip (`bldesy://auth/callback…`). Kept free of React Native / Supabase
 * imports so vitest can exercise it directly; `lib/auth/oauth.ts` does the
 * side effects.
 *
 * Two shapes can come back depending on the client's `flowType`:
 *   - implicit (supabase-js default): tokens in the URL FRAGMENT
 *       bldesy://auth/callback#access_token=…&refresh_token=…&token_type=bearer
 *   - pkce: a one-time code in the QUERY
 *       bldesy://auth/callback?code=…
 * Provider/consent failures arrive as `error` + `error_description` in either
 * position.
 */

export type OAuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error'; error: string; description: string | null };

/** Everything after the first `?` and before any `#`, without the `?`. */
function queryOf(url: string): string {
  const hashAt = url.indexOf('#');
  const withoutHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const q = withoutHash.indexOf('?');
  return q === -1 ? '' : withoutHash.slice(q + 1);
}

/** Everything after the first `#`, without the `#`. */
function fragmentOf(url: string): string {
  const hashAt = url.indexOf('#');
  return hashAt === -1 ? '' : url.slice(hashAt + 1);
}

/**
 * Parse an OAuth redirect URL. Returns null when the URL carries neither a
 * code, a token pair, nor an error (e.g. the user closed the browser and we
 * were handed the bare redirect URL).
 */
export function parseOAuthCallbackUrl(url: string | null | undefined): OAuthCallback | null {
  if (!url) return null;

  // Fragment first: with the implicit flow Supabase puts everything there,
  // and a provider error in the fragment must win over a stale query string.
  const fragment = new URLSearchParams(fragmentOf(url));
  const query = new URLSearchParams(queryOf(url));

  const error = fragment.get('error') ?? query.get('error');
  if (error) {
    return {
      kind: 'error',
      error,
      description: fragment.get('error_description') ?? query.get('error_description'),
    };
  }

  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }

  const code = query.get('code') ?? fragment.get('code');
  if (code) return { kind: 'code', code };

  return null;
}
