import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  buildReferralSharePayload,
  formatCents,
  normaliseReferralCode,
  referralShareMessage,
} from '@/lib/data/referrals';

describe('buildReferralSharePayload', () => {
  it('pins the exact text + url a mate receives (website P2.5)', () => {
    expect(buildReferralSharePayload('BLD-7XK4Q', 'https://bldesy.com.au/join?ref=BLD-7XK4Q')).toEqual({
      text: 'Get on BLDESY — use my code BLD-7XK4Q when you sign up.',
      url: 'https://bldesy.com.au/join?ref=BLD-7XK4Q',
    });
    expect(referralShareMessage('BLD-7XK4Q', 'https://x/join?ref=BLD-7XK4Q')).toBe(
      'Get on BLDESY — use my code BLD-7XK4Q when you sign up. https://x/join?ref=BLD-7XK4Q',
    );
  });
});

describe('formatCents', () => {
  it('whole dollars without decimals, otherwise two', () => {
    expect(formatCents(2000)).toBe('$20');
    expect(formatCents(0)).toBe('$0');
    expect(formatCents(2050)).toBe('$20.50');
    expect(formatCents(199)).toBe('$1.99');
  });
});

describe('normaliseReferralCode', () => {
  it('canonicalises case, whitespace and the bare body', () => {
    expect(normaliseReferralCode(' bld-7xk4q ')).toBe('BLD-7XK4Q');
    expect(normaliseReferralCode('7xk4q')).toBe('BLD-7XK4Q');
    expect(normaliseReferralCode('BLD- 7XK4Q')).toBe('BLD-7XK4Q');
  });
  it('rejects ambiguous letters, wrong lengths and empties', () => {
    expect(normaliseReferralCode('BLD-7XK40')).toBeNull(); // 0 not in alphabet
    expect(normaliseReferralCode('BLD-7XK4')).toBeNull();
    expect(normaliseReferralCode('')).toBeNull();
    expect(normaliseReferralCode(null)).toBeNull();
  });
});
