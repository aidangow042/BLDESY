import { describe, expect, it } from 'vitest';

import {
  FEATURED_TRADES,
  addKeyword,
  buildSearchParams,
  hasSearchQuery,
  keywordHintFor,
  matchTone,
  pageNumbers,
  parseSearchQuery,
  resetFilterParams,
  resultsCountLabel,
  resultsHeading,
  searchHref,
  sortOptionsFor,
  thresholdBadgeLabel,
  toggleLicensedState,
  tradeNamesFor,
  withPage,
  withParam,
  withVerifiedToggled,
  withoutSpecialisation,
} from '@/components/search/search-params';

describe('parseSearchQuery / hasSearchQuery', () => {
  it('reads every website param, defaults sort + page, treats show=results as a query', () => {
    const q = parseSearchQuery({ show: 'results' });
    expect(q.sort).toBe('relevance');
    expect(q.page).toBe(1);
    expect(q.verified).toBe(false);
    expect(hasSearchQuery(q)).toBe(true);
    expect(hasSearchQuery(parseSearchQuery({}))).toBe(false);
    expect(hasSearchQuery(parseSearchQuery({ sort: 'rating' }))).toBe(false);
  });

  it('clamps page to >= 1 and rejects unknown sorts', () => {
    expect(parseSearchQuery({ page: '0' }).page).toBe(1);
    expect(parseSearchQuery({ page: 'abc' }).page).toBe(1);
    expect(parseSearchQuery({ page: '3' }).page).toBe(3);
    expect(parseSearchQuery({ sort: 'bogus' }).sort).toBe('relevance');
    expect(parseSearchQuery({ sort: ['closest'] }).sort).toBe('closest');
  });
});

describe('buildSearchParams', () => {
  it('mirrors the form submit: show=results, trimmed location, deduped keywords incl. the pending word, specs only for selected trades', () => {
    const params = buildSearchParams({
      trades: ['roofer', 'plumber'],
      location: ' Newtown ',
      urgency: 'asap',
      keywords: ['leak', 'roof'],
      pendingKeyword: 'Leak',
      specialisations: { roofer: ['colorbond-metal-roofing'], tiler: ['floor-tiling'] },
    });
    expect(params).toEqual({
      show: 'results',
      trade: 'roofer,plumber',
      location: 'Newtown',
      urgency: 'asap',
      keywords: 'leak,roof',
      specialisations: 'colorbond-metal-roofing',
    });
  });

  it('omits empty fields', () => {
    expect(buildSearchParams({ trades: [], location: '', urgency: '', keywords: [], pendingKeyword: '', specialisations: {} })).toEqual({
      show: 'results',
    });
  });
});

describe('searchHref', () => {
  it('encodes params and drops undefined/empty ones', () => {
    expect(searchHref({ trade: 'plumber', location: 'Surry Hills', show: undefined })).toBe('/search?trade=plumber&location=Surry%20Hills');
    expect(searchHref({})).toBe('/search');
  });
});

describe('param patches', () => {
  const params = { trade: 'plumber', location: 'Newtown', page: '3', specialisations: 'a,b', sort: 'rating' };

  it('withParam sets or clears a key and always drops page', () => {
    expect(withParam(params, 'urgency', 'asap')).toMatchObject({ trade: 'plumber', urgency: 'asap', page: undefined });
    expect(withParam(params, 'sort', '')).toMatchObject({ sort: undefined, page: undefined });
  });

  it('withoutSpecialisation removes one slug, clearing the key when none remain', () => {
    expect(withoutSpecialisation(params, 'a').specialisations).toBe('b');
    expect(withoutSpecialisation({ specialisations: 'a' }, 'a').specialisations).toBeUndefined();
  });

  it('withVerifiedToggled flips verified', () => {
    expect(withVerifiedToggled(params).verified).toBe('true');
    expect(withVerifiedToggled({ ...params, verified: 'true' }).verified).toBeUndefined();
  });

  it('resetFilterParams keeps only trade + location (and stays on results)', () => {
    const patch = resetFilterParams({ ...params, verified: 'true', urgency: 'asap' });
    expect(patch.trade).toBe('plumber');
    expect(patch.location).toBe('Newtown');
    expect(patch.verified).toBeUndefined();
    expect(patch.urgency).toBeUndefined();
    expect(patch.sort).toBeUndefined();
    expect(patch.show).toBe('results');
  });

  it('withPage drops the param on page 1', () => {
    expect(withPage(params, 1).page).toBeUndefined();
    expect(withPage(params, 2).page).toBe('2');
  });

  it('toggleLicensedState adds/removes a state', () => {
    expect(toggleLicensedState(['NSW'], 'QLD')).toEqual(['NSW', 'QLD']);
    expect(toggleLicensedState(['NSW', 'QLD'], 'NSW')).toEqual(['QLD']);
  });
});

describe('option lists', () => {
  it('slots Closest second only with a location', () => {
    expect(sortOptionsFor(true).map((o) => o.value)).toEqual(['relevance', 'closest', 'rating', 'available', 'newest']);
    expect(sortOptionsFor(false).map((o) => o.value)).toEqual(['relevance', 'rating', 'available', 'newest']);
  });

  it('resolves the featured trades to their catalogue names', () => {
    expect(FEATURED_TRADES.map((t) => t.name)).toEqual(['Builder', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Roofer']);
  });
});

describe('keyword hints', () => {
  it('matches on word boundaries, not substrings', () => {
    expect(keywordHintFor('waterproofing')).toBeNull(); // must not hint Roofer via "roof"
    expect(keywordHintFor('roof leak')?.trades.map((t) => t.slug)).toEqual(['roofer']);
    expect(keywordHintFor('hot water')?.keyword).toBe('hot water');
    expect(keywordHintFor('de')).toBeNull();
  });

  it('addKeyword lowercases, trims and dedupes', () => {
    expect(addKeyword(['deck'], ' Deck ')).toEqual(['deck']);
    expect(addKeyword(['deck'], 'Pergola')).toEqual(['deck', 'pergola']);
    expect(addKeyword(['deck'], '  ')).toEqual(['deck']);
  });
});

describe('copy rules', () => {
  it('resultsHeading follows the web precedence', () => {
    expect(resultsHeading('Plumber', 'Newtown')).toBe('Plumber in Newtown');
    expect(resultsHeading('Plumber')).toBe('Plumber');
    expect(resultsHeading(undefined, 'Newtown')).toBe('Tradies in Newtown');
    expect(resultsHeading()).toBe('All Tradies');
  });

  it('pluralises the result count and threshold badge', () => {
    expect(resultsCountLabel(1)).toBe('Showing 1 result');
    expect(resultsCountLabel(12)).toBe('Showing 12 results');
    expect(thresholdBadgeLabel(5000)).toBe('Not licensed — jobs under $5,000 only');
  });

  it('maps trade slugs to names, keeping unknown slugs', () => {
    expect(tradeNamesFor('plumber,electrician,zzz')).toBe('Plumber, Electrician, zzz');
    expect(tradeNamesFor(undefined)).toBeUndefined();
  });

  it('pageNumbers is the current ± 2 window, clamped', () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, 3]);
    expect(pageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(pageNumbers(10, 10)).toEqual([8, 9, 10]);
  });

  it('matchTone buckets at 80 / 60', () => {
    expect(matchTone(80)).toBe('high');
    expect(matchTone(79)).toBe('mid');
    expect(matchTone(59)).toBe('low');
  });
});
