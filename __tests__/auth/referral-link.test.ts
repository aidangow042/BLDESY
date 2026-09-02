import { describe, expect, it } from 'vitest';

import { normaliseReferralCode, parseReferralDeepLink } from '@/lib/auth/referral-link';

describe('normaliseReferralCode', () => {
  it('passes a canonical code through', () => {
    expect(normaliseReferralCode('BLD-7XK4Q')).toBe('BLD-7XK4Q');
  });

  it('upper-cases, trims and strips whitespace', () => {
    expect(normaliseReferralCode('  bld-7xk4q ')).toBe('BLD-7XK4Q');
    expect(normaliseReferralCode('BLD- 7XK 4Q')).toBe('BLD-7XK4Q');
  });

  it('adds the prefix to a bare 5-character body', () => {
    expect(normaliseReferralCode('7xk4q')).toBe('BLD-7XK4Q');
  });

  it('rejects wrong lengths, ambiguous characters and empty input', () => {
    expect(normaliseReferralCode('BLD-7XK4')).toBeNull();
    expect(normaliseReferralCode('BLD-7XK4QQ')).toBeNull();
    expect(normaliseReferralCode('BLD-0OIL1')).toBeNull(); // 0/O/I/L/1 are not in the alphabet
    expect(normaliseReferralCode('')).toBeNull();
    expect(normaliseReferralCode('   ')).toBeNull();
    expect(normaliseReferralCode(null)).toBeNull();
    expect(normaliseReferralCode(undefined)).toBeNull();
  });
});

describe('parseReferralDeepLink', () => {
  it('reads the code from the production share link', () => {
    expect(parseReferralDeepLink('bldesy://join?ref=BLD-7XK4Q')).toBe('BLD-7XK4Q');
    expect(parseReferralDeepLink('bldesy:///join?ref=BLD-7XK4Q')).toBe('BLD-7XK4Q');
  });

  it('normalises the code it finds', () => {
    expect(parseReferralDeepLink('bldesy://join?ref=bld-7xk4q')).toBe('BLD-7XK4Q');
    expect(parseReferralDeepLink('bldesy://join?ref=7xk4q')).toBe('BLD-7XK4Q');
  });

  it('accepts universal links and dev-client links', () => {
    expect(parseReferralDeepLink('https://www.bldesy.com.au/join?ref=BLD-7XK4Q')).toBe('BLD-7XK4Q');
    expect(parseReferralDeepLink('exp://192.168.1.5:8081/--/join?ref=BLD-7XK4Q')).toBe('BLD-7XK4Q');
  });

  it('accepts a link straight into the signup screen, group segment or not', () => {
    expect(parseReferralDeepLink('bldesy://signup?ref=BLD-7XK4Q')).toBe('BLD-7XK4Q');
    expect(parseReferralDeepLink('bldesy://(auth)/signup?ref=BLD-7XK4Q')).toBe('BLD-7XK4Q');
  });

  it('ignores other query params and a trailing fragment', () => {
    expect(parseReferralDeepLink('bldesy://join?utm_source=sms&ref=BLD-7XK4Q#top')).toBe('BLD-7XK4Q');
  });

  it('returns null when the path is not a referral landing', () => {
    expect(parseReferralDeepLink('bldesy://portal?ref=BLD-7XK4Q')).toBeNull();
    expect(parseReferralDeepLink('bldesy://join/extra?ref=BLD-7XK4Q')).toBeNull();
    expect(parseReferralDeepLink('https://www.bldesy.com.au/?ref=BLD-7XK4Q')).toBeNull();
  });

  it('returns null when there is no ref or the code is invalid', () => {
    expect(parseReferralDeepLink('bldesy://join')).toBeNull();
    expect(parseReferralDeepLink('bldesy://join?ref=')).toBeNull();
    expect(parseReferralDeepLink('bldesy://join?ref=BLD-0OIL1')).toBeNull();
  });

  it('returns null for empty or scheme-less input', () => {
    expect(parseReferralDeepLink(null)).toBeNull();
    expect(parseReferralDeepLink(undefined)).toBeNull();
    expect(parseReferralDeepLink('')).toBeNull();
    expect(parseReferralDeepLink('join?ref=BLD-7XK4Q')).toBeNull();
  });
});
