import { describe, expect, it } from 'vitest';

import {
  HOMEOWNER_TRADES,
  NON_HOMEOWNER_TRADE_SLUGS,
  ON_WAITLIST_PAGE,
  URGENCY_OPTIONS,
  WAITLIST_ERRORS,
  contactIcon,
  contactVerb,
  parseContact,
  validateStep2,
} from '@/components/waitlist/waitlist-logic';
import { LAUNCH_TRADES } from '@/lib/web/launch-trades';
import { getAllTrades } from '@/lib/web/trades';

describe('parseContact — the step-1 smart field', () => {
  it('rejects an empty field with the website copy', () => {
    expect(parseContact('   ')).toEqual({ ok: false, error: WAITLIST_ERRORS.missingContact });
  });

  it('treats anything with an @ as an email and validates it', () => {
    expect(parseContact('bob@')).toEqual({ ok: false, error: WAITLIST_ERRORS.badEmail });
    expect(parseContact(' bob@example.com ')).toEqual({
      ok: true,
      channel: 'email',
      email: 'bob@example.com',
      phone: '',
    });
  });

  it('accepts an Australian mobile in any common format', () => {
    for (const raw of ['0412 345 678', '0412345678', '+61 412 345 678', '61412345678']) {
      const parsed = parseContact(raw);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.channel).toBe('phone');
        expect(parsed.phone).toBe(raw.trim());
        expect(parsed.email).toBe('');
      }
    }
  });

  it('rejects a landline or random text as neither', () => {
    expect(parseContact('02 9876 5432')).toEqual({ ok: false, error: WAITLIST_ERRORS.neither });
    expect(parseContact('newtown')).toEqual({ ok: false, error: WAITLIST_ERRORS.neither });
  });
});

describe('contactIcon / contactVerb', () => {
  it('shows the phone glyph while the field looks numeric', () => {
    expect(contactIcon('04')).toBe('phone');
    expect(contactIcon('+61 4')).toBe('phone');
    expect(contactIcon('(04) 12')).toBe('phone');
    expect(contactIcon('')).toBe('mail');
    expect(contactIcon('bob')).toBe('mail');
  });

  it('says "email" when an address is on file, else "text"', () => {
    expect(contactVerb('bob@example.com')).toBe('email');
    expect(contactVerb('  ')).toBe('text');
  });
});

describe('validateStep2 — only the channel step 1 did not capture is checked', () => {
  it('validates the added mobile for email joiners', () => {
    expect(validateStep2('email', '123', '')).toBe(WAITLIST_ERRORS.badStep2Mobile);
    expect(validateStep2('email', '0412 345 678', '')).toBeNull();
    expect(validateStep2('email', '', 'not-an-email')).toBeNull(); // email field ignored for email joiners
  });

  it('validates the added email for phone joiners', () => {
    expect(validateStep2('phone', '', 'nope')).toBe(WAITLIST_ERRORS.badEmail);
    expect(validateStep2('phone', '', 'bob@example.com')).toBeNull();
    expect(validateStep2('phone', 'garbage', '')).toBeNull(); // phone field ignored for phone joiners
  });

  it('passes when both optional fields are blank', () => {
    expect(validateStep2('email', '', '')).toBeNull();
    expect(validateStep2(null, '', '')).toBeNull();
  });
});

describe('HOMEOWNER_TRADES — launch six first, then the rest A–Z', () => {
  it('leads with LAUNCH_TRADES in model order', () => {
    expect(HOMEOWNER_TRADES.slice(0, LAUNCH_TRADES.length).map((t) => t.slug)).toEqual([...LAUNCH_TRADES]);
  });

  it('keeps every homeowner trade — including unstocked ones like tiler — with no duplicates', () => {
    const slugs = HOMEOWNER_TRADES.map((t) => t.slug);
    expect(slugs).toContain('tiler');
    expect(new Set(slugs).size).toBe(slugs.length);
    const expected = getAllTrades().filter((t) => !NON_HOMEOWNER_TRADE_SLUGS.has(t.slug)).length;
    expect(slugs.length).toBe(expected);
  });

  it('drops the commercial/industrial trades and sorts the tail alphabetically', () => {
    const slugs = HOMEOWNER_TRADES.map((t) => t.slug);
    for (const slug of NON_HOMEOWNER_TRADE_SLUGS) expect(slugs).not.toContain(slug);
    const tail = HOMEOWNER_TRADES.slice(LAUNCH_TRADES.length).map((t) => t.name);
    expect(tail).toEqual([...tail].sort((a, b) => a.localeCompare(b)));
  });
});

describe('copy switches', () => {
  it('hides the form heading only on the /waitlist page sources', () => {
    expect(ON_WAITLIST_PAGE.has('waitlist_page')).toBe(true);
    expect(ON_WAITLIST_PAGE.has('gated_redirect')).toBe(true);
    expect(ON_WAITLIST_PAGE.has('coverage_map')).toBe(false);
    expect(ON_WAITLIST_PAGE.has('search_miss')).toBe(false);
  });

  it('offers the four urgency pills in the web order', () => {
    expect(URGENCY_OPTIONS.map(([v]) => v)).toEqual(['asap', 'this_week', 'few_months', 'planning']);
    expect(URGENCY_OPTIONS.map(([, l]) => l)).toEqual(['ASAP', 'This week', 'Next few months', 'Just planning']);
  });
});
