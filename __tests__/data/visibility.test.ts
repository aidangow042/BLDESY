import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));

import {
  buildVisibilityPatch,
  isRowVisible,
  revertVisibilityKey,
  visibilityStateFrom,
} from '@/lib/data/visibility';
import { BLDESY_SCORE_TOGGLE_KEY } from '@/lib/web/profile-visibility';

describe('buildVisibilityPatch', () => {
  it('hiding stores false; showing removes the key (absent = visible)', () => {
    const current = { about: false };
    expect(buildVisibilityPatch(current, 'projects', false)).toEqual({
      column: 'profile_visibility',
      value: { about: false, projects: false },
    });
    expect(buildVisibilityPatch(current, 'about', true)).toEqual({ column: 'profile_visibility', value: {} });
    expect(current).toEqual({ about: false }); // never mutated
  });
  it('tolerates a null map and never stores true', () => {
    expect(buildVisibilityPatch(null, 'reviews', true)).toEqual({ column: 'profile_visibility', value: {} });
    expect(buildVisibilityPatch(undefined, 'reviews', false)).toEqual({
      column: 'profile_visibility',
      value: { reviews: false },
    });
  });
  it('the BLDESY Score row writes its own column', () => {
    expect(buildVisibilityPatch({ about: false }, BLDESY_SCORE_TOGGLE_KEY, true)).toEqual({
      column: 'display_bldesy_score',
      value: true,
    });
  });
});

describe('revertVisibilityKey / isRowVisible / visibilityStateFrom', () => {
  it('reverts one key only', () => {
    expect(revertVisibilityKey({ a: false, b: false }, 'a', true)).toEqual({ b: false });
    expect(revertVisibilityKey({ b: false }, 'a', false)).toEqual({ a: false, b: false });
  });
  it('row state: score from its column, everything else from the map', () => {
    const state = { visibility: { about: false }, displayBldesyScore: true };
    expect(isRowVisible(state, 'about')).toBe(false);
    expect(isRowVisible(state, 'team')).toBe(true);
    expect(isRowVisible(state, BLDESY_SCORE_TOGGLE_KEY)).toBe(true);
    expect(isRowVisible({ ...state, displayBldesyScore: false }, BLDESY_SCORE_TOGGLE_KEY)).toBe(false);
  });
  it('normalises nulls like the page initialisers', () => {
    expect(
      visibilityStateFrom({
        profile_visibility: null as unknown as Record<string, boolean>,
        display_bldesy_score: false,
        availability_display_mode: null as unknown as 'hidden',
      }),
    ).toEqual({ visibility: {}, displayBldesyScore: false, availabilityDisplayMode: 'hidden' });
  });
});
