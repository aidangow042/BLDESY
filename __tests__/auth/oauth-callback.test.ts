import { describe, expect, it } from 'vitest';

import { parseOAuthCallbackUrl } from '@/lib/auth/oauth-callback';

const REDIRECT = 'bldesy://auth/callback';

describe('parseOAuthCallbackUrl', () => {
  it('reads the implicit-flow token pair from the fragment', () => {
    const url = `${REDIRECT}#access_token=AT&expires_in=3600&refresh_token=RT&token_type=bearer&type=signup`;
    expect(parseOAuthCallbackUrl(url)).toEqual({
      kind: 'tokens',
      accessToken: 'AT',
      refreshToken: 'RT',
    });
  });

  it('reads the PKCE code from the query', () => {
    expect(parseOAuthCallbackUrl(`${REDIRECT}?code=abc-123`)).toEqual({
      kind: 'code',
      code: 'abc-123',
    });
  });

  it('accepts a code that a provider put in the fragment', () => {
    expect(parseOAuthCallbackUrl(`${REDIRECT}#code=frag-code`)).toEqual({
      kind: 'code',
      code: 'frag-code',
    });
  });

  it('surfaces a provider error from the fragment, with its description decoded', () => {
    const url = `${REDIRECT}#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`;
    expect(parseOAuthCallbackUrl(url)).toEqual({
      kind: 'error',
      error: 'access_denied',
      description: 'Email link is invalid or has expired',
    });
  });

  it('surfaces a provider error from the query', () => {
    expect(parseOAuthCallbackUrl(`${REDIRECT}?error=server_error`)).toEqual({
      kind: 'error',
      error: 'server_error',
      description: null,
    });
  });

  it('lets an error win over tokens that happen to be present', () => {
    const url = `${REDIRECT}?code=stale#error=access_denied&access_token=AT&refresh_token=RT`;
    expect(parseOAuthCallbackUrl(url)?.kind).toBe('error');
  });

  it('returns null for the bare redirect and for half a token pair', () => {
    expect(parseOAuthCallbackUrl(REDIRECT)).toBeNull();
    expect(parseOAuthCallbackUrl(`${REDIRECT}#access_token=AT`)).toBeNull();
    expect(parseOAuthCallbackUrl(`${REDIRECT}?`)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseOAuthCallbackUrl(null)).toBeNull();
    expect(parseOAuthCallbackUrl(undefined)).toBeNull();
    expect(parseOAuthCallbackUrl('')).toBeNull();
  });
});
