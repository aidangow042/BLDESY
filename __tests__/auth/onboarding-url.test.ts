import { describe, expect, it } from 'vitest';

import {
  buildOnboardingUrl,
  ENTERPRISE_WAITLIST_PATH,
  resolveOnboardingNext,
} from '@/lib/auth/onboarding-url';

const BASE = 'https://www.bldesy.com.au';
const TOKENS = { accessToken: 'AT.token', refreshToken: 'RT.token' };

describe('resolveOnboardingNext', () => {
  it('sends a fresh tradie to the live wizard slug, not the legacy one', () => {
    expect(resolveOnboardingNext('builder')).toBe('join-as-a-tradie');
  });

  it('forwards a pending referral code via the website share-link landing', () => {
    expect(resolveOnboardingNext('builder', null, 'BLD-7XK4Q')).toBe('join?ref=BLD-7XK4Q');
  });

  it('lets an explicit next override the default and the referral, stripping a leading slash', () => {
    expect(resolveOnboardingNext('builder', 'portal/pending', 'BLD-7XK4Q')).toBe('portal/pending');
    expect(resolveOnboardingNext('builder', '/portal/billing')).toBe('portal/billing');
    expect(resolveOnboardingNext('builder', 'portal/edit-profile?step=2')).toBe('portal/edit-profile?step=2');
  });

  it('defaults the enterprise target to the company listing and ignores referral codes there', () => {
    expect(resolveOnboardingNext('enterprise')).toBe('list-company');
    expect(resolveOnboardingNext('enterprise', null, 'BLD-7XK4Q')).toBe('list-company');
    expect(resolveOnboardingNext('enterprise', 'enterprise/pending')).toBe('enterprise/pending');
  });

  it('always resolves the hiring waitlist to its public page', () => {
    expect(resolveOnboardingNext('enterprise-waitlist')).toBe(ENTERPRISE_WAITLIST_PATH);
    expect(resolveOnboardingNext('enterprise-waitlist', 'portal/pending', 'BLD-7XK4Q')).toBe(
      'for-builders/waitlist',
    );
  });
});

describe('buildOnboardingUrl', () => {
  it('puts the session tokens and next in the FRAGMENT of the bridge URL, never the query', () => {
    const url = buildOnboardingUrl(BASE, 'builder', 'join-as-a-tradie', TOKENS);
    expect(url.startsWith(`${BASE}/auth/app-bridge#`)).toBe(true);
    expect(url).not.toContain('?');

    const fragment = new URLSearchParams(url.slice(url.indexOf('#') + 1));
    expect(fragment.get('access_token')).toBe('AT.token');
    expect(fragment.get('refresh_token')).toBe('RT.token');
    expect(fragment.get('next')).toBe('join-as-a-tradie');
  });

  it('round-trips a next that carries its own query string', () => {
    const url = buildOnboardingUrl(BASE, 'builder', 'portal/edit-profile?step=2', TOKENS);
    // The only "?" allowed is the encoded one inside the fragment param.
    expect(url.indexOf('?')).toBe(-1);
    const fragment = new URLSearchParams(url.slice(url.indexOf('#') + 1));
    expect(fragment.get('next')).toBe('portal/edit-profile?step=2');
  });

  it('round-trips a referral next', () => {
    const url = buildOnboardingUrl(BASE, 'builder', 'join?ref=BLD-7XK4Q', TOKENS);
    const fragment = new URLSearchParams(url.slice(url.indexOf('#') + 1));
    expect(fragment.get('next')).toBe('join?ref=BLD-7XK4Q');
  });

  it('opens the page directly when there is no session', () => {
    expect(buildOnboardingUrl(BASE, 'builder', 'join-as-a-tradie', null)).toBe(`${BASE}/join-as-a-tradie`);
    expect(buildOnboardingUrl(BASE, 'enterprise', 'list-company', null)).toBe(`${BASE}/list-company`);
  });

  it('opens the hiring waitlist directly and never leaks tokens into it', () => {
    const url = buildOnboardingUrl(BASE, 'enterprise-waitlist', ENTERPRISE_WAITLIST_PATH, TOKENS);
    expect(url).toBe(`${BASE}/for-builders/waitlist`);
    expect(url).not.toContain('token');
  });

  it('tolerates a trailing slash on the base URL', () => {
    expect(buildOnboardingUrl(`${BASE}/`, 'builder', 'join-as-a-tradie', null)).toBe(`${BASE}/join-as-a-tradie`);
  });
});
