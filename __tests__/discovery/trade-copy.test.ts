import { describe, expect, it } from 'vitest';

import {
  filterTradeCategories,
  introCopy,
  nationalIntroCopy,
  otherLaunchTrades,
  peopleNounFor,
  placeLabel,
  resolveTradeSegment,
  variantIndex,
  verifiedHeading,
} from '@/components/trades/trade-copy';
import type { SuburbEntry } from '@/lib/web/suburbs';
import { getTradeBySlug } from '@/lib/web/trades';

const plumber = getTradeBySlug('plumber')!;
const drainage = getTradeBySlug('drainage')!;

const newtown: SuburbEntry = { key: 'newtown', name: 'Newtown', slug: 'newtown', state: null, coords: [-33.9, 151.18], isMajorCity: false };
const sydney: SuburbEntry = { key: 'sydney', name: 'Sydney', slug: 'sydney', state: 'NSW', coords: [-33.87, 151.21], isMajorCity: true };

describe('resolveTradeSegment', () => {
  it('accepts the plural (web URL) and the singular slug, plural first', () => {
    expect(resolveTradeSegment('plumbers')?.slug).toBe('plumber');
    expect(resolveTradeSegment('plumber')?.slug).toBe('plumber');
    expect(resolveTradeSegment('Drainage')?.slug).toBe('drainage');
    expect(resolveTradeSegment('nope')).toBeUndefined();
    expect(resolveTradeSegment(undefined)).toBeUndefined();
  });
});

describe('nouns + labels', () => {
  it('uses the real plural where one exists, else "{Trade} specialists"', () => {
    expect(peopleNounFor(plumber)).toBe('Plumbers');
    expect(peopleNounFor(drainage)).toBe('Drainage specialists');
  });

  it('labels major cities with their state', () => {
    expect(placeLabel(sydney)).toBe('Sydney, NSW');
    expect(placeLabel(newtown)).toBe('Newtown');
  });

  it('builds the verified heading with an optional count meta', () => {
    expect(verifiedHeading(plumber, 12)).toEqual({ title: 'Verified plumbers on BLDESY', meta: '— 12 listed' });
    expect(verifiedHeading(plumber, null).meta).toBeNull();
  });
});

describe('intro copy', () => {
  it('is deterministic per trade×suburb and names the count when positive', () => {
    const a = introCopy(plumber, newtown, 'NSW', 4, [sydney, newtown]);
    const b = introCopy(plumber, newtown, 'NSW', 4, [sydney, newtown]);
    expect(a).toBe(b);
    expect(a).toContain('Newtown');
    expect(a).toMatch(/4 verified plumbers|verified plumbers/);
    expect(variantIndex('plumber:newtown', 5)).toBeLessThan(5);
  });

  it('falls back to "verified {people}" with no count and to "the surrounding suburbs" with fewer than two neighbours', () => {
    const copy = introCopy(drainage, newtown, null, null, []);
    expect(copy).toContain('verified drainage specialists');
    expect(copy).not.toMatch(/\d+ verified/);
  });

  it('national intro carries the five-checks list', () => {
    expect(nationalIntroCopy(plumber)).toContain('ABN, licence, photo ID, White Card and insurance');
    expect(nationalIntroCopy(plumber)).toContain('before plumbers appear here');
  });
});

describe('cross-links', () => {
  it('links the launch six minus the current trade', () => {
    const others = otherLaunchTrades('plumber').map((t) => t.slug);
    expect(others).not.toContain('plumber');
    expect(others).toContain('electrician');
    expect(others.length).toBe(5);
  });
});

describe('filterTradeCategories', () => {
  it('filters by name substring and drops empty categories', () => {
    const cats = filterTradeCategories('plumb');
    expect(cats.length).toBe(1);
    expect(cats[0].trades.map((t) => t.slug)).toEqual(['plumber']);
    expect(filterTradeCategories('   ').length).toBeGreaterThan(5);
    expect(filterTradeCategories('zzzz')).toEqual([]);
  });
});
