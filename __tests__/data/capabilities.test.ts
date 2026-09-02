import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  CAPABILITY_ROW_COLUMNS,
  CAPABILITY_ROW_SELECT,
  capabilitiesAreEmpty,
  capabilitiesInputFrom,
  INVALID_PUBLIC_LIABILITY,
  INVALID_WHITE_CARD_NUMBER,
  isValidWhiteCardNumber,
  validateCapabilitiesInput,
} from '@/lib/data/capabilities';
import { ALL_CAPABILITY_KEYS, emptyCapabilities } from '@/lib/web/capabilities';

const base = capabilitiesInputFrom(emptyCapabilities('t1'));

describe('validateCapabilitiesInput', () => {
  it('accepts the four liability bands only', () => {
    for (const band of [null, 5_000_000, 10_000_000, 20_000_000]) {
      expect(validateCapabilitiesInput({ ...base, public_liability_amount: band })).toBeNull();
    }
    expect(validateCapabilitiesInput({ ...base, public_liability_amount: 1 })).toBe(INVALID_PUBLIC_LIABILITY);
  });

  it('White Card number must be 8 digits when setting; clearing is fine', () => {
    expect(isValidWhiteCardNumber('12345678')).toBe(true);
    expect(isValidWhiteCardNumber('1234567')).toBe(false);
    expect(isValidWhiteCardNumber('1234567a')).toBe(false);
    expect(validateCapabilitiesInput({ ...base, white_card: true, white_card_number: ' 12345678 ' })).toBeNull();
    expect(validateCapabilitiesInput({ ...base, white_card: true, white_card_number: '123' })).toBe(
      INVALID_WHITE_CARD_NUMBER,
    );
    expect(validateCapabilitiesInput({ ...base, white_card: false, white_card_number: '123' })).toBeNull();
    expect(validateCapabilitiesInput({ ...base, white_card: true, white_card_number: null })).toBeNull();
    expect(validateCapabilitiesInput({ ...base, white_card: true, white_card_number: '' })).toBeNull();
    // omitted key = keep stored, nothing to validate
    expect(validateCapabilitiesInput({ ...base, white_card: true })).toBeNull();
  });
});

describe('capabilitiesInputFrom', () => {
  it('carries exactly the 15 booleans + liability + notes, never the verification flags', () => {
    const input = capabilitiesInputFrom({ ...emptyCapabilities('t1'), white_card_verified: true, notes: '  ' });
    const keys = Object.keys(input).sort();
    expect(keys).toEqual([...ALL_CAPABILITY_KEYS, 'notes', 'public_liability_amount'].sort());
    expect(keys).not.toContain('white_card_verified');
    expect(keys).not.toContain('tradie_id');
    expect(input.notes).toBeNull();
  });
  it('includes white_card_number only when the form touched it', () => {
    expect('white_card_number' in capabilitiesInputFrom(emptyCapabilities('t'))).toBe(false);
    expect(capabilitiesInputFrom(emptyCapabilities('t'), null).white_card_number).toBeNull();
    expect(capabilitiesInputFrom(emptyCapabilities('t'), '12345678').white_card_number).toBe('12345678');
  });
});

describe('row column list', () => {
  it('never selects the encrypted / service-only columns', () => {
    expect(CAPABILITY_ROW_COLUMNS).not.toContain('white_card_number');
    expect(CAPABILITY_ROW_COLUMNS).not.toContain('white_card_warning_sent_at');
    expect(CAPABILITY_ROW_SELECT).toContain('white_card_verified_at');
  });
});

describe('capabilitiesAreEmpty', () => {
  it('ignores notes/updated_at and flags any real value', () => {
    expect(capabilitiesAreEmpty(null)).toBe(true);
    expect(capabilitiesAreEmpty({ ...emptyCapabilities('t'), notes: 'hi', updated_at: 'now' })).toBe(true);
    expect(capabilitiesAreEmpty({ ...emptyCapabilities('t'), own_tools: true })).toBe(false);
    expect(capabilitiesAreEmpty({ ...emptyCapabilities('t'), public_liability_amount: 5_000_000 })).toBe(false);
  });
});
