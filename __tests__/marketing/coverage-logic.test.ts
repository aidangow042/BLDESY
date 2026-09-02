import { describe, expect, it } from 'vitest';

import {
  EXCLUDE_RING,
  LOCAL_ENTRIES,
  MAX_MATCHES,
  isZoneDimmed,
  localMatches,
  mergeNationalMatches,
  ringLabelNames,
  ringNames,
  zoneAnchors,
  zoneLabelAnchor,
} from '@/components/coverage/coverage-logic';
import { RING_LABELS, SUBURB_GEO } from '@/components/coverage/geo';
import { COVERAGE_ZONES, SEARCH_ALIASES } from '@/lib/web/coverage-map/config';

describe('LOCAL_ENTRIES — the instant search index', () => {
  it('lists every launch-zone suburb with its zone', () => {
    for (const zone of COVERAGE_ZONES) {
      for (const suburb of zone.suburbs) {
        const entry = LOCAL_ENTRIES.find((e) => e.label === suburb);
        expect(entry, suburb).toBeDefined();
        expect(entry?.zoneSlug).toBe(zone.slug);
        expect(entry?.zoneName).toBe(zone.name);
      }
    }
  });

  it('adds the aliases people type, pinned to their real locality', () => {
    for (const [alias, real] of Object.entries(SEARCH_ALIASES)) {
      const entry = LOCAL_ENTRIES.find((e) => e.label === alias);
      expect(entry, alias).toBeDefined();
      expect(entry?.zoneSlug).not.toBeNull();
      // An alias without its own boundary pins the real suburb's geometry.
      if (!SUBURB_GEO[alias]) expect(entry?.geoName).toBe(real);
    }
  });

  it('includes the greyed ring as "not covered" but never the non-residential geometry', () => {
    const eastwood = LOCAL_ENTRIES.find((e) => e.label === 'Eastwood');
    expect(eastwood).toEqual({ label: 'Eastwood', geoName: 'Eastwood', zoneSlug: null, zoneName: null });
    for (const excluded of EXCLUDE_RING) {
      expect(LOCAL_ENTRIES.find((e) => e.label === excluded)).toBeUndefined();
    }
  });

  it('is sorted by label with no duplicate labels', () => {
    const labels = LOCAL_ENTRIES.map((e) => e.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(new Set(labels.map((l) => l.toLowerCase())).size).toBe(labels.length);
  });
});

describe('localMatches', () => {
  it('needs two characters and ranks prefix matches before substring matches', () => {
    expect(localMatches('n')).toEqual([]);
    const matches = localMatches('newt');
    expect(matches[0]?.label).toBe('Newtown');
    const starts = localMatches('ma').filter((e) => e.label.toLowerCase().startsWith('ma'));
    const all = localMatches('ma');
    expect(all.slice(0, starts.length)).toEqual(starts);
  });

  it('caps the list', () => {
    expect(localMatches('a').length).toBe(0);
    expect(localMatches('ar').length).toBeLessThanOrEqual(MAX_MATCHES);
    expect(localMatches('e', 3).length).toBe(0);
    expect(localMatches('el', 3).length).toBeLessThanOrEqual(3);
  });

  it('is case-insensitive and trims', () => {
    expect(localMatches('  NEWTOWN ')[0]?.label).toBe('Newtown');
  });
});

describe('mergeNationalMatches', () => {
  const local = localMatches('newt');

  it('tops the list up with national suggestions, resolving their zone', () => {
    const merged = mergeNationalMatches(local, ['Newtown', 'Newport', 'Balmain']);
    expect(merged.filter((e) => e.label === 'Newtown').length).toBe(1);
    expect(merged.find((e) => e.label === 'Newport')).toEqual({
      label: 'Newport',
      geoName: 'Newport',
      zoneSlug: null,
      zoneName: null,
    });
    expect(merged.find((e) => e.label === 'Balmain')?.zoneSlug).toBe('upper-inner-west');
  });

  it('drops bare postcodes and case-variant duplicates, and caps at the limit', () => {
    const merged = mergeNationalMatches(local, ['2042', 'NEWTOWN', 'Newport']);
    expect(merged.find((e) => e.label === '2042')).toBeUndefined();
    expect(merged.filter((e) => e.label.toLowerCase() === 'newtown').length).toBe(1);
    const many = mergeNationalMatches([], Array.from({ length: 20 }, (_, i) => `Town ${i}`));
    expect(many.length).toBe(MAX_MATCHES);
  });
});

describe('map joins', () => {
  it('keeps zone members out of the greyed ring and its labels', () => {
    const members = new Set(COVERAGE_ZONES.flatMap((z) => z.suburbs));
    for (const n of ringNames) expect(members.has(n)).toBe(false);
    for (const n of ringLabelNames) {
      expect(members.has(n)).toBe(false);
      expect(RING_LABELS).toContain(n);
      expect(SUBURB_GEO[n]).toBeDefined();
    }
  });

  it('computes a finite, nudged label anchor for every zone', () => {
    for (const zone of COVERAGE_ZONES) {
      const anchor = zoneLabelAnchor(zone);
      expect(Number.isFinite(anchor.x)).toBe(true);
      expect(Number.isFinite(anchor.y)).toBe(true);
      expect(zoneAnchors.get(zone.slug)).toEqual(anchor);
      // Removing the nudge lands inside the map.
      expect(anchor.x - zone.nudge[0]).toBeGreaterThan(0);
      expect(anchor.y - zone.nudge[1]).toBeGreaterThan(0);
    }
  });

  it('dims the other zones when one is active, and every zone in outside mode', () => {
    expect(isZoneDimmed('a', 'a', false)).toBe(false);
    expect(isZoneDimmed('b', 'a', false)).toBe(true);
    expect(isZoneDimmed('a', null, true)).toBe(true);
    expect(isZoneDimmed('a', null, false)).toBe(false);
    // An active zone wins over outside mode.
    expect(isZoneDimmed('a', 'a', true)).toBe(false);
  });
});
