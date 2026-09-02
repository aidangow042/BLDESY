import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));

import {
  bookedDaysFrom,
  isNextDateInPast,
  isValidYmd,
  MAX_OCCUPIED_ENTRIES,
  nextOccupancyOnTap,
  OCCUPIED_LIMIT_MESSAGE,
  pruneOccupied,
  suggestNextAvailable,
  toggleOccupiedDay,
} from '@/lib/data/availability';
import type { OccupiedDates } from '@/types/database';

const TODAY = '2026-07-15';

describe('pruneOccupied', () => {
  it('drops history before this month and anything past the 12-month window', () => {
    const dates: OccupiedDates = {
      '2026-06-30': 'full', // last month → dropped
      '2026-07-01': 'full', // this month (before today) → kept
      '2026-07-20': 'full',
      '2027-06-30': 'am', // 11 months ahead → kept
      '2027-07-01': 'full', // 12 months ahead → dropped
    };
    expect(Object.keys(pruneOccupied(dates, TODAY)).sort()).toEqual(['2026-07-01', '2026-07-20', '2027-06-30']);
  });
  it('handles the December → January roll', () => {
    const pruned = pruneOccupied({ '2026-12-31': 'full', '2027-11-30': 'full', '2027-12-01': 'full' }, '2026-12-05');
    expect(Object.keys(pruned).sort()).toEqual(['2026-12-31', '2027-11-30']);
  });
});

describe('toggleOccupiedDay', () => {
  it('books and clears without mutating', () => {
    const start: OccupiedDates = { '2026-07-20': 'full' };
    const booked = toggleOccupiedDay(start, '2026-07-21', 'full');
    expect(booked).toEqual({ ok: true, dates: { '2026-07-20': 'full', '2026-07-21': 'full' } });
    const cleared = toggleOccupiedDay(start, '2026-07-20', null);
    expect(cleared).toEqual({ ok: true, dates: {} });
    expect(start).toEqual({ '2026-07-20': 'full' });
  });
  it(`refuses the ${MAX_OCCUPIED_ENTRIES + 1}th entry with the website message`, () => {
    const full: OccupiedDates = {};
    for (let i = 0; i < MAX_OCCUPIED_ENTRIES; i++) full[`k${i}`] = 'full';
    const r = toggleOccupiedDay(full, 'extra', 'full');
    expect(r).toEqual({ ok: false, reason: 'limit', message: OCCUPIED_LIMIT_MESSAGE });
    // clearing at the cap is always allowed
    expect(toggleOccupiedDay(full, 'k0', null).ok).toBe(true);
  });
});

describe('tap semantics + suggestions', () => {
  it('a booked future day clears, anything else books "full"; past days never count as busy', () => {
    const dates: OccupiedDates = { '2026-07-20': 'full', '2026-07-01': 'full' };
    expect(nextOccupancyOnTap(dates, '2026-07-20', TODAY)).toBeNull();
    expect(nextOccupancyOnTap(dates, '2026-07-21', TODAY)).toBe('full');
    expect(nextOccupancyOnTap(dates, '2026-07-01', TODAY)).toBe('full');
  });
  it('suggests the first unbooked day after today', () => {
    expect(suggestNextAvailable({}, TODAY)).toBe('2026-07-16');
    expect(suggestNextAvailable({ '2026-07-16': 'full', '2026-07-17': 'am' }, TODAY)).toBe('2026-07-18');
    expect(suggestNextAvailable({ '2026-07-31': 'full' }, '2026-07-30')).toBe('2026-08-01');
  });
  it('booked days from today, sorted', () => {
    expect(bookedDaysFrom({ '2026-07-20': 'full', '2026-07-01': 'full', '2026-07-16': 'pm' }, TODAY)).toEqual([
      '2026-07-16',
      '2026-07-20',
    ]);
  });
});

describe('date validation', () => {
  it('isValidYmd requires a real calendar date', () => {
    expect(isValidYmd('2026-07-15')).toBe(true);
    expect(isValidYmd('2026-02-30')).toBe(false);
    expect(isValidYmd('2026-7-5')).toBe(false);
    expect(isValidYmd('')).toBe(false);
    expect(isValidYmd(null)).toBe(false);
  });
  it('isNextDateInPast', () => {
    expect(isNextDateInPast('2026-07-14', TODAY)).toBe(true);
    expect(isNextDateInPast('2026-07-15', TODAY)).toBe(false);
    expect(isNextDateInPast(null, TODAY)).toBe(false);
  });
});
