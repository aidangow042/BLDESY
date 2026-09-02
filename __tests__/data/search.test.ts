import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_RADIUS_KM,
  PAGE_SIZE,
  SEARCH_SELECT,
  TRADE_CARD_SELECT,
  aggregateRatings,
  areaOrConditions,
  parseListParam,
  refineByCoverage,
  resolveSearchTotal,
  sanitiseTradeSlugs,
  sortSearchResults,
  tradeOrConditions,
} from '@/lib/data/search';
import type { BuilderSearchResult } from '@/types';

vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));

const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };

function result(partial: Record<string, unknown>): BuilderSearchResult {
  return { user_id: String(partial.user_id ?? 'x'), availability: 'available', ...partial } as unknown as BuilderSearchResult;
}

describe('search constants', () => {
  it('pages 12 results like /search', () => {
    expect(PAGE_SIZE).toBe(12);
    expect(DEFAULT_RADIUS_KM).toBe(30);
  });

  it('select lists only carry view columns (no billing fields)', () => {
    for (const list of [SEARCH_SELECT, TRADE_CARD_SELECT]) {
      expect(list).toContain('user_id');
      expect(list).toContain('slug');
      expect(list).not.toMatch(/plan_state|subscription_|stripe_/);
    }
    expect(SEARCH_SELECT).toContain('bldesy_score');
    expect(SEARCH_SELECT).toContain('next_available_date');
  });
});

describe('parseListParam / sanitiseTradeSlugs / tradeOrConditions', () => {
  it('splits comma lists, trims and drops blanks', () => {
    expect(parseListParam('a, b,,  c ')).toEqual(['a', 'b', 'c']);
    expect(parseListParam(undefined)).toEqual([]);
    expect(parseListParam('')).toEqual([]);
  });

  it('keeps only safe trade slugs', () => {
    expect(sanitiseTradeSlugs('plumber,pest_control,garage-doors')).toEqual([
      'plumber',
      'pest_control',
      'garage-doors',
    ]);
    expect(sanitiseTradeSlugs('plumber,x.eq.y,tiler)')).toEqual(['plumber']);
    expect(sanitiseTradeSlugs(undefined)).toEqual([]);
  });

  it('matches primary trade OR the trade_categories array, per trade', () => {
    expect(tradeOrConditions(['plumber'])).toBe('trade_category.eq.plumber,trade_categories.cs.{plumber}');
    expect(tradeOrConditions(['plumber', 'tiler'])).toBe(
      'trade_category.eq.plumber,trade_categories.cs.{plumber},trade_category.eq.tiler,trade_categories.cs.{tiler}',
    );
    expect(tradeOrConditions([])).toBeNull();
  });
});

describe('areaOrConditions', () => {
  it('builds an 80km bounding box and a service_areas overlap for the searched point', () => {
    const or = areaOrConditions(SYDNEY, 'Sydney');
    const latDelta = 80 / 111;
    expect(or.startsWith(`and(latitude.gte.${SYDNEY.latitude - latDelta},latitude.lte.${SYDNEY.latitude + latDelta},`)).toBe(true);
    expect(or).toContain('longitude.gte.');
    expect(or).toContain('longitude.lte.');
    // Sydney CBD sits inside the Sydney metro region and NSW — both prefixes emitted.
    expect(or).toContain('service_areas.ov.{');
    expect(or).toContain('"region:Sydney"');
    expect(or).toContain('"cover:Sydney"');
    expect(or).toContain('"state:NSW"');
  });

  it('uses the postcode-derived state when the search text is a postcode', () => {
    const or = areaOrConditions({ latitude: -37.8136, longitude: 144.9631 }, '3000');
    expect(or).toContain('"state:VIC"');
  });

  it('omits the overlap clause for a point no zone or state covers', () => {
    // Middle of the Indian Ocean: no city within 150km, no state.
    const or = areaOrConditions({ latitude: -30, longitude: 100 }, undefined);
    expect(or).not.toContain('service_areas.ov');
    expect(or.split(',').length).toBe(4);
  });
});

describe('refineByCoverage', () => {
  it('keeps builders within their radius of the point, drops the rest', () => {
    const near = { user_id: 'near', latitude: -33.87, longitude: 151.21, radius_km: 10, service_areas: [] };
    const far = { user_id: 'far', latitude: -34.4278, longitude: 150.8931, radius_km: 10, service_areas: [] }; // Wollongong
    expect(refineByCoverage([near, far], SYDNEY, 'NSW').map((b) => b.user_id)).toEqual(['near']);
  });

  it('applies the 30km default radius when radius_km is null', () => {
    const b = { user_id: 'b', latitude: -33.75, longitude: 151.2, radius_km: null, service_areas: [] }; // ~13km north
    expect(refineByCoverage([b], SYDNEY, 'NSW')).toHaveLength(1);
    const c = { user_id: 'c', latitude: -33.4, longitude: 151.2, radius_km: null, service_areas: [] }; // ~52km north
    expect(refineByCoverage([c], SYDNEY, 'NSW')).toHaveLength(0);
  });

  it('keeps a far builder whose region/state coverage claims the point', () => {
    const regional = { user_id: 'r', latitude: -34.4278, longitude: 150.8931, radius_km: 10, service_areas: ['region:Sydney'] };
    const stateWide = { user_id: 's', latitude: -30.5, longitude: 151.6, radius_km: 10, service_areas: ['state:NSW'] };
    const otherState = { user_id: 'o', latitude: -30.5, longitude: 151.6, radius_km: 10, service_areas: ['state:VIC'] };
    expect(refineByCoverage([regional, stateWide, otherState], SYDNEY, 'NSW').map((b) => b.user_id)).toEqual(['r', 's']);
  });

  it('passes builders without coordinates (their coverage claim is what matched)', () => {
    const noCoords = { user_id: 'n', latitude: null, longitude: null, radius_km: null, service_areas: null };
    expect(refineByCoverage([noCoords], SYDNEY, 'NSW')).toHaveLength(1);
  });
});

describe('aggregateRatings', () => {
  it('averages per tradie and counts reviews', () => {
    const agg = aggregateRatings([
      { reviewee_id: 'a', rating: 5 },
      { reviewee_id: 'a', rating: 4 },
      { reviewee_id: 'b', rating: 3 },
    ]);
    expect(agg.get('a')).toEqual({ average: 4.5, count: 2 });
    expect(agg.get('b')).toEqual({ average: 3, count: 1 });
    expect(agg.get('c')).toBeUndefined();
    expect(aggregateRatings([]).size).toBe(0);
  });
});

describe('sortSearchResults', () => {
  const a = result({ user_id: 'a', _match: { percent: 60, details: [] }, _rating: { average: 4.0, count: 10 }, _distanceKm: 5, availability: 'limited', created_at: '2026-01-01T00:00:00Z' });
  const b = result({ user_id: 'b', _match: { percent: 90, details: [] }, _rating: { average: 4.8, count: 2 }, _distanceKm: 12, availability: 'available', created_at: '2026-03-01T00:00:00Z' });
  const c = result({ user_id: 'c', _match: { percent: 90, details: [] }, _rating: null, _distanceKm: 2, availability: 'unavailable', created_at: '2026-02-01T00:00:00Z' });
  const d = result({ user_id: 'd', _match: { percent: 60, details: [] }, _rating: { average: 4.8, count: 5 }, _distanceKm: null, availability: 'available', created_at: '2025-12-01T00:00:00Z' });
  const ids = (rows: BuilderSearchResult[]) => rows.map((r) => r.user_id);

  it('relevance: match desc, then rating average, then distance (null last)', () => {
    // b & c tie on 90: b has a rating → first. a & d tie on 60 and d has the better average.
    expect(ids(sortSearchResults([a, b, c, d], 'relevance', true))).toEqual(['b', 'c', 'd', 'a']);
  });

  it('rating: average desc, more reviews break ties, then match; unrated last', () => {
    // b & d tie on 4.8 → d has more reviews (5 vs 2).
    expect(ids(sortSearchResults([a, b, c, d], 'rating', true))).toEqual(['d', 'b', 'a', 'c']);
  });

  it('closest: distance asc (missing distance sorts last), then match', () => {
    expect(ids(sortSearchResults([a, b, c, d], 'closest', true))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('closest without a geocoded location degrades to relevance', () => {
    expect(ids(sortSearchResults([a, b, c, d], 'closest', false))).toEqual(['b', 'c', 'd', 'a']);
  });

  it('available: available → limited → unavailable, then match', () => {
    // b (90) before d (60) among available.
    expect(ids(sortSearchResults([a, b, c, d], 'available', true))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('newest: created_at desc', () => {
    expect(ids(sortSearchResults([a, b, c, d], 'newest', true))).toEqual(['b', 'c', 'a', 'd']);
  });

  it('unknown sort falls back to relevance and sorts in place', () => {
    const rows = [a, b, c, d];
    const returned = sortSearchResults(rows, undefined, false);
    expect(returned).toBe(rows);
    expect(ids(rows)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('resolveSearchTotal', () => {
  it('uses the DB count unless a JS-side filter ran', () => {
    expect(resolveSearchTotal(false, 3, 120)).toBe(120);
    expect(resolveSearchTotal(false, 3, null)).toBe(0);
    expect(resolveSearchTotal(true, 3, 120)).toBe(3);
  });
});
