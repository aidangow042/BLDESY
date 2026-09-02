import { describe, expect, it } from 'vitest';

import {
  capitalise,
  fallbackNouns,
  liveTradeSentence,
  peopleNoun,
  personNoun,
  resolveTrade,
} from '@/components/waitlist/search-fallback-copy';
import { getTradeBySlug, type Trade } from '@/lib/web/trades';

const plumber = getTradeBySlug('plumber') as Trade;
const electrician = getTradeBySlug('electrician') as Trade;
const handyman = getTradeBySlug('handyman') as Trade;
const guttering = getTradeBySlug('guttering') as Trade;

describe('people/person nouns', () => {
  it('uses the real plural where one exists', () => {
    expect(peopleNoun(plumber)).toBe('Plumbers');
    expect(peopleNoun(handyman)).toBe('Handymen');
    expect(personNoun(plumber)).toBe('Plumber');
  });

  it('falls back to "specialists" for identity-plural trades', () => {
    expect(guttering).toBeDefined();
    expect(peopleNoun(guttering)).toBe('Guttering specialists');
    expect(personNoun(guttering)).toBe('Guttering specialist');
  });
});

describe('liveTradeSentence', () => {
  it('handles zero, one and many with an Oxford-comma-free list', () => {
    expect(liveTradeSentence([])).toBe('a first few verified trades');
    expect(liveTradeSentence([plumber])).toBe('plumbers');
    expect(liveTradeSentence([plumber, electrician])).toBe('plumbers and electricians');
    expect(liveTradeSentence([plumber, electrician, handyman])).toBe('plumbers, electricians and handymen');
  });
});

describe('fallbackNouns / resolveTrade', () => {
  it('resolves slugs and passes Trade records through', () => {
    expect(resolveTrade('plumber')?.slug).toBe('plumber');
    expect(resolveTrade(plumber)).toBe(plumber);
    expect(resolveTrade('not-a-trade')).toBeUndefined();
    expect(resolveTrade(undefined)).toBeUndefined();
  });

  it('builds the wall nouns from the trade, a bare name, or nothing', () => {
    expect(fallbackNouns(plumber)).toEqual({ who: 'plumbers', oneOf: 'plumber' });
    expect(fallbackNouns(undefined, 'Tiler')).toEqual({ who: 'tilers', oneOf: 'tradie' });
    expect(fallbackNouns(undefined)).toEqual({ who: 'tradies', oneOf: 'tradie' });
  });

  it('capitalises the first letter only', () => {
    expect(capitalise('plumbers')).toBe('Plumbers');
    expect(capitalise('')).toBe('');
  });
});
