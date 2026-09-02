import { describe, expect, it } from 'vitest';

import type { MapBuilder } from '@/lib/data/map';
import {
  FILTER_TRADES,
  baseFilter,
  chipCounts,
  clusterSize,
  emptyStateHeadline,
  filterByTrade,
  formatDistanceKm,
  matchesSpecialty,
  matchesTrade,
  rank,
  regionContains,
  searchIndex,
  specialtiesForTrade,
  specialtyPills,
  tradieCountLabel,
} from '@/components/map/map-logic';

function builder(over: Partial<MapBuilder>): MapBuilder {
  return {
    id: 'u1',
    user_id: 'u1',
    slug: 's',
    business_name: 'Harbour City Plumbing',
    trade_category: 'plumber',
    trade_categories: null,
    suburb: 'Newtown',
    postcode: '2042',
    state: 'NSW',
    latitude: -33.9,
    longitude: 151.18,
    radius_km: 25,
    availability: 'available',
    profile_photo_url: null,
    phone: null,
    email: null,
    website: null,
    specialisations: null,
    credentials_verified: null,
    bldesy_score: null,
    display_bldesy_score: null,
    response_time: null,
    next_available_date: null,
    ...over,
  };
}

describe('trade / specialty matching', () => {
  it('matches the primary trade or any secondary trade, case-insensitively', () => {
    const b = builder({ trade_category: 'plumber', trade_categories: ['gas-fitter'] });
    expect(matchesTrade(b, 'All')).toBe(true);
    expect(matchesTrade(b, 'Plumber')).toBe(true);
    expect(matchesTrade(b, 'Gas Fitter')).toBe(true);
    expect(matchesTrade(b, 'Electrician')).toBe(false);
  });

  it('matches a specialty token against the trade-scoped slugs', () => {
    const b = builder({ specialisations: { plumber: ['pipe-relining'] } });
    const token = { tradeSlug: 'plumber', tradeName: 'Plumber', slug: 'pipe-relining', name: 'Pipe Relining' };
    expect(matchesSpecialty(b, token)).toBe(true);
    expect(matchesSpecialty(b, { ...token, tradeSlug: 'drainage' })).toBe(false);
    expect(matchesSpecialty(b, null)).toBe(true);
  });
});

describe('bounds + counts', () => {
  const region = { latitude: -33.9, longitude: 151.2, latitudeDelta: 0.2, longitudeDelta: 0.2 };

  it('regionContains tests the half-deltas', () => {
    expect(regionContains(region, { latitude: -33.95, longitude: 151.25 })).toBe(true);
    expect(regionContains(region, { latitude: -34.1, longitude: 151.2 })).toBe(false);
  });

  it('applies specialty + bounds first, then the trade chip, and counts per chip', () => {
    const all = [
      builder({ id: 'a', user_id: 'a', trade_category: 'plumber' }),
      builder({ id: 'b', user_id: 'b', trade_category: 'electrician' }),
      builder({ id: 'c', user_id: 'c', trade_category: 'plumber', latitude: -35 }),
    ];
    const base = baseFilter(all, null, region);
    expect(base.map((b) => b.id)).toEqual(['a', 'b']);
    expect(filterByTrade(base, 'Plumber').map((b) => b.id)).toEqual(['a']);
    const counts = chipCounts(base);
    expect(counts.All).toBe(2);
    expect(counts.Plumber).toBe(1);
    expect(counts.Electrician).toBe(1);
    expect(counts.Tiler).toBe(0);
    expect(Object.keys(counts)).toEqual([...FILTER_TRADES]);
  });
});

describe('smart search index', () => {
  it('ranks prefix > word-boundary > substring and caps results at 4 trades / 6 specialties', () => {
    expect(rank('ev', 'EV Charger Installation')).toBe(0);
    expect(rank('charger', 'EV Charger Installation')).toBe(1);
    expect(rank('arge', 'EV Charger Installation')).toBe(2);
    expect(rank('zzz', 'EV Charger Installation')).toBe(-1);
    const { trades, specialties } = searchIndex('pl');
    expect(trades.length).toBeLessThanOrEqual(4);
    expect(specialties.length).toBeLessThanOrEqual(6);
    expect(trades[0].name).toMatch(/^Pl/);
  });

  it('lists a picked trade’s specialties with the parent name', () => {
    const specs = specialtiesForTrade({ kind: 'trade', name: 'Plumber', slug: 'plumber' });
    expect(specs.length).toBeGreaterThan(0);
    expect(specs.every((s) => s.tradeName === 'Plumber' && s.tradeSlug === 'plumber')).toBe(true);
  });

  it('flattens specialisations to pills, skipping slugs not in the catalogue', () => {
    expect(specialtyPills({ plumber: ['pipe-relining', 'nope'], zzz: ['x'] })).toEqual([{ slug: 'pipe-relining', name: 'Pipe Relining' }]);
    expect(specialtyPills(null)).toEqual([]);
  });
});

describe('presentation rules', () => {
  it('sizes clusters by count', () => {
    expect(clusterSize(3)).toBe(34);
    expect(clusterSize(10)).toBe(40);
    expect(clusterSize(50)).toBe(46);
  });

  it('builds the empty-state headline', () => {
    expect(emptyStateHeadline('All', null)).toBe('No tradies here yet');
    expect(emptyStateHeadline('Plumber', null)).toBe('No plumbers here yet');
    expect(emptyStateHeadline('Plumber', 'Pipe Relining')).toBe('No tradies doing "Pipe Relining" here yet');
  });

  it('formats distances and counts', () => {
    expect(formatDistanceKm(0.4)).toBe('<1');
    expect(formatDistanceKm(2.6)).toBe('3');
    expect(tradieCountLabel(1, 'nearby')).toBe('1 tradie nearby');
    expect(tradieCountLabel(4, 'found')).toBe('4 tradies found');
  });
});
