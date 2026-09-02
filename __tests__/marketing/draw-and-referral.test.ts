import { describe, expect, it } from 'vitest';

import {
  DRAW_ENTRY_CTA,
  DRAW_LIVE,
  DRAW_PRIZE_CAP,
  DRAW_TERMS_LINK_TEXT,
  LEGACY_PRIZE_AUD,
  drawCardPhrase,
  drawEntryHeading,
  drawPrizeAud,
  drawStep1Line,
  formatDrawPrize,
  prizeForNamedJobs,
} from '@/components/waitlist/draw-prize';
import {
  REFERRAL_BONUS_CAP,
  bonusEntries,
  buildMateShareUrl,
  normaliseMateCode,
} from '@/components/waitlist/referral-codes';
import { chipTone, foundingSpotsToShow } from '@/components/supply/supply-logic';
import { FOUNDING_COUNTER_MIN_TAKEN } from '@/lib/web/founding-offer';

describe('draw-prize copy (verbatim website copy, dark-launched)', () => {
  it('ships dark — the fixed $250 card is what every surface renders', () => {
    expect(DRAW_LIVE).toBe(false);
    expect(drawPrizeAud(999)).toBe(LEGACY_PRIZE_AUD);
    expect(drawCardPhrase()).toBe('$250 Bunnings gift card');
    expect(drawEntryHeading()).toBe('Enter the $250 Bunnings draw');
    expect(DRAW_ENTRY_CTA).toBe('Enter the $250 draw');
    expect(DRAW_TERMS_LINK_TEXT).toBe('$250 draw terms');
    expect(drawStep1Line()).toBe('One quick question after you join enters you in the draw for a $250 Bunnings gift card.');
  });

  it('formats whole dollars and grows the escalating prize defensively', () => {
    expect(formatDrawPrize(250.4)).toBe('$250');
    expect(prizeForNamedJobs(-3)).toBe(100);
    expect(prizeForNamedJobs(Number.NaN)).toBe(100);
    expect(prizeForNamedJobs(10)).toBe(150);
    expect(prizeForNamedJobs(1000)).toBe(DRAW_PRIZE_CAP);
  });
});

describe('MATE- referral codes', () => {
  it('normalises case, whitespace and a bare body', () => {
    expect(normaliseMateCode(' mate-7xk4q ')).toBe('MATE-7XK4Q');
    expect(normaliseMateCode('7xk4q')).toBe('MATE-7XK4Q');
    expect(normaliseMateCode('MATE-7XK4Q')).toBe('MATE-7XK4Q');
  });

  it('rejects the ambiguous alphabet, wrong lengths and empties', () => {
    expect(normaliseMateCode('MATE-0OIL1')).toBeNull();
    expect(normaliseMateCode('MATE-7XK4')).toBeNull();
    expect(normaliseMateCode('')).toBeNull();
    expect(normaliseMateCode(null)).toBeNull();
  });

  it('builds the website share link and caps bonus entries', () => {
    expect(buildMateShareUrl('MATE-7XK4Q')).toMatch(/\/waitlist\?mate=MATE-7XK4Q$/);
    expect(bonusEntries(9)).toBe(REFERRAL_BONUS_CAP);
    expect(bonusEntries(-2)).toBe(0);
    expect(bonusEntries(3)).toBe(3);
  });
});

describe('supply widgets', () => {
  it('tints chips by remaining spots', () => {
    expect(chipTone(0)).toBe('full');
    expect(chipTone(3)).toBe('low');
    expect(chipTone(4)).toBe('ok');
  });

  it('shows the founding counter only between the floor and the cap', () => {
    expect(foundingSpotsToShow(null)).toBeNull();
    expect(foundingSpotsToShow({ taken: FOUNDING_COUNTER_MIN_TAKEN - 1, remaining: 190 })).toBeNull();
    expect(foundingSpotsToShow({ taken: FOUNDING_COUNTER_MIN_TAKEN, remaining: 185 })).toBe(185);
    expect(foundingSpotsToShow({ taken: 200, remaining: 0 })).toBeNull();
  });
});
