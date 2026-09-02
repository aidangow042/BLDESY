import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) },
}));

import {
  applyUrgencyFilter,
  builderTradesFor,
  DEFAULT_RADIUS_KM,
  feedKindFilters,
  filterContracts,
  filterFullMatches,
  filterJobsByBuilderRadius,
  formatPayCaption,
  getTradieMatchForJob,
  HIDDEN_JOBS_STORAGE_KEY,
  jobMatchesSpeciality,
  matchResultsFor,
  parseHiddenJobIds,
  serialiseHiddenJobIds,
  sortBySpecialityMatch,
  type Job,
} from '@/lib/data/tradie-jobs';
import { emptyCapabilities } from '@/lib/web/capabilities';

const SYDNEY = { latitude: -33.8688, longitude: 151.2093 };
const COORDS: Record<string, { latitude: number; longitude: number } | null> = {
  Near: { latitude: -33.9, longitude: 151.2 }, // ~3.5km from the CBD
  Far: { latitude: -34.2, longitude: 151.2 }, // ~37km
  'Surry Hills': { latitude: -33.886, longitude: 151.211 },
  Typo: null,
  Brisbane: { latitude: -27.4698, longitude: 153.0251 },
};
const geocodeFn = async (s: string) => COORDS[s] ?? null;

function job(overrides: Partial<Job> & { id: string }): Job {
  return {
    customer_id: 'c',
    title: 't',
    description: 'd',
    trade_category: 'plumber',
    urgency: 'flexible',
    budget: null,
    suburb: 'Near',
    postcode: '2000',
    status: 'open',
    created_at: '2026-08-01T00:00:00Z',
    poster_type: 'customer',
    posting_kind: 'job',
    contract_type: null,
    contract_roles: null,
    workers_needed: 1,
    contract_duration: null,
    day_rate: null,
    start_date: null,
    site_requirements: null,
    photo_urls: null,
    document_urls: null,
    employment_type: null,
    end_date: null,
    is_ongoing: false,
    daily_start_time: null,
    daily_finish_time: null,
    days_per_week: null,
    work_days: null,
    pay_type: null,
    pay_rate_min: null,
    pay_rate_max: null,
    required_capabilities: {},
    min_public_liability: null,
    specialisations: [],
    is_test: false,
    ...overrides,
  };
}

describe('feedKindFilters / builderTradesFor', () => {
  it('maps the three feeds to the website query filters', () => {
    expect(feedKindFilters('home')).toEqual({ poster_type: 'customer' });
    expect(feedKindFilters('project')).toEqual({ poster_type: 'enterprise', posting_kind: 'job' });
    expect(feedKindFilters('contract')).toEqual({ poster_type: 'enterprise', posting_kind: 'contract' });
  });
  it('prefers trade_categories, falls back to trade_category, else none', () => {
    expect(builderTradesFor({ trade_category: 'plumber', trade_categories: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(builderTradesFor({ trade_category: 'plumber', trade_categories: [] })).toEqual(['plumber']);
    expect(builderTradesFor({ trade_category: null, trade_categories: null })).toEqual([]);
    expect(builderTradesFor(null)).toEqual([]);
  });
});

describe('filterJobsByBuilderRadius', () => {
  const jobs = [
    job({ id: 'near', suburb: 'Near' }),
    job({ id: 'far', suburb: 'Far' }),
    job({ id: 'typo', suburb: 'Typo' }),
    job({ id: 'bne', suburb: 'Brisbane', postcode: '4000' }),
  ];

  it('returns jobs unchanged with no builder, or no home base and no coverage', async () => {
    expect(await filterJobsByBuilderRadius(jobs, null, geocodeFn)).toBe(jobs);
    expect(
      await filterJobsByBuilderRadius(
        jobs,
        { latitude: null, longitude: null, radius_km: null, service_areas: ['Newtown'] },
        geocodeFn,
      ),
    ).toEqual(jobs);
  });

  it(`applies the ${DEFAULT_RADIUS_KM}km default radius and INCLUDES ungeocodable suburbs`, async () => {
    const out = await filterJobsByBuilderRadius(
      jobs,
      { ...SYDNEY, radius_km: null, service_areas: null },
      geocodeFn,
    );
    expect(out.map((j) => j.id)).toEqual(['near', 'typo']);
  });

  it('respects radius_km', async () => {
    const out = await filterJobsByBuilderRadius(jobs, { ...SYDNEY, radius_km: 50, service_areas: null }, geocodeFn);
    expect(out.map((j) => j.id)).toEqual(['near', 'far', 'typo']);
  });

  it('a zone claim (Primary or Can cover) reaches jobs far from home base', async () => {
    const perthBase = { latitude: -31.9523, longitude: 115.8613, radius_km: 10 };
    const primary = await filterJobsByBuilderRadius(
      [job({ id: 'sh', suburb: 'Surry Hills' }), job({ id: 'far', suburb: 'Far' })],
      { ...perthBase, service_areas: ['region:Inner City / CBD'] },
      geocodeFn,
    );
    expect(primary.map((j) => j.id)).toEqual(['sh']);
    const cover = await filterJobsByBuilderRadius(
      [job({ id: 'sh', suburb: 'Surry Hills' })],
      { ...perthBase, service_areas: ['cover:Inner City / CBD'] },
      geocodeFn,
    );
    expect(cover.map((j) => j.id)).toEqual(['sh']);
  });

  it('a state claim matches straight off the postcode, no geocode needed', async () => {
    const calls: string[] = [];
    const spy = async (s: string) => {
      calls.push(s);
      return geocodeFn(s);
    };
    const out = await filterJobsByBuilderRadius(
      [job({ id: 'bne', suburb: 'Brisbane', postcode: '4000' }), job({ id: 'far', suburb: 'Far' })],
      { latitude: null, longitude: null, radius_km: null, service_areas: ['state:QLD'] },
      spy,
    );
    expect(out.map((j) => j.id)).toEqual(['bne']);
  });
});

describe('list transforms', () => {
  const a = job({ id: 'a', urgency: 'asap', specialisations: ['emergency-plumber'] });
  const b = job({ id: 'b', urgency: 'flexible', specialisations: ['roof-plumber'] });
  const c = job({ id: 'c', urgency: 'this_week', specialisations: [] });

  it('urgency filter', () => {
    expect(applyUrgencyFilter([a, b, c], 'all').map((j) => j.id)).toEqual(['a', 'b', 'c']);
    expect(applyUrgencyFilter([a, b, c], 'asap').map((j) => j.id)).toEqual(['a']);
  });

  it('speciality match floats to the top, stable otherwise; never hides', () => {
    const specs = { plumber: ['roof-plumber'] };
    expect(jobMatchesSpeciality(b, specs)).toBe(true);
    expect(jobMatchesSpeciality(a, specs)).toBe(false);
    expect(jobMatchesSpeciality(c, specs)).toBe(false);
    expect(sortBySpecialityMatch([a, b, c], specs).map((j) => j.id)).toEqual(['b', 'a', 'c']);
    expect(sortBySpecialityMatch([a, b, c], {}).map((j) => j.id)).toEqual(['a', 'b', 'c']);
  });

  it('hide-unmatched keeps no-requirement jobs and full matches only', () => {
    const needsCard = job({ id: 'wc', required_capabilities: { white_card: 'required' } });
    const caps = { ...emptyCapabilities('t'), white_card: true };
    const noCaps = emptyCapabilities('t');
    const withCaps = matchResultsFor([a, needsCard], caps);
    const without = matchResultsFor([a, needsCard], noCaps);
    expect(filterFullMatches([a, needsCard], withCaps, true).map((j) => j.id)).toEqual(['a', 'wc']);
    expect(filterFullMatches([a, needsCard], without, true).map((j) => j.id)).toEqual(['a']);
    expect(filterFullMatches([a, needsCard], without, false)).toHaveLength(2);
  });

  it('contracts: hidden removed, My = applied, search over title/description/suburb', () => {
    const list = [
      job({ id: '1', title: 'Fitout crew', description: 'Long job', suburb: 'Newtown' }),
      job({ id: '2', title: 'Roof', description: 'Sydney CBD tower', suburb: 'Sydney' }),
      job({ id: '3', title: 'Hidden', description: '', suburb: 'Glebe' }),
    ];
    const base = { hiddenJobIds: new Set(['3']), appliedJobIds: new Set(['2']), subTab: 'explore' as const, search: '' };
    expect(filterContracts(list, base).map((j) => j.id)).toEqual(['1', '2']);
    expect(filterContracts(list, { ...base, subTab: 'my' }).map((j) => j.id)).toEqual(['2']);
    expect(filterContracts(list, { ...base, search: 'cbd' }).map((j) => j.id)).toEqual(['2']);
    expect(filterContracts(list, { ...base, search: 'NEWTOWN' }).map((j) => j.id)).toEqual(['1']);
  });
});

describe('getTradieMatchForJob', () => {
  it('counts missing required items plus an unmet liability minimum', () => {
    const j = job({
      id: 'x',
      required_capabilities: { white_card: 'required', first_aid: 'preferred' },
      min_public_liability: 10_000_000,
    });
    const none = getTradieMatchForJob(j, null);
    expect(none.tier).toBe('none');
    expect(none.missingCount).toBe(2);
    const full = getTradieMatchForJob(j, {
      ...emptyCapabilities('t'),
      white_card: true,
      first_aid: true,
      public_liability_amount: 20_000_000,
    });
    expect(full.tier).toBe('full');
    expect(full.headline).toBe('All requirements met');
    expect(full.missingCount).toBe(0);
    expect(getTradieMatchForJob(job({ id: 'y' }), null).headline).toBe('No specific requirements');
  });
});

describe('formatPayCaption', () => {
  it('matches the website captions', () => {
    expect(formatPayCaption('negotiable', null, null)).toBe('Pay negotiable');
    expect(formatPayCaption('hourly', null, null)).toBe('Hourly rate');
    expect(formatPayCaption(null, null, null)).toBeNull();
    expect(formatPayCaption('hourly', 45, 55)).toBe('$45–$55/hr');
    expect(formatPayCaption('daily', 400, 400)).toBe('$400/day');
    expect(formatPayCaption('fixed_contract', null, 1800)).toBe('$1,800');
  });
});

describe('hidden jobs storage', () => {
  it('uses the website localStorage keys', () => {
    expect(HIDDEN_JOBS_STORAGE_KEY).toEqual({
      home: 'bldesy_hidden_home_jobs',
      project: 'bldesy_hidden_project_jobs',
      contract: 'bldesy_hidden_contracts',
    });
  });
  it('round-trips and tolerates junk', () => {
    const ids = new Set(['a', 'b']);
    expect(parseHiddenJobIds(serialiseHiddenJobIds(ids))).toEqual(ids);
    expect(parseHiddenJobIds(null)).toEqual(new Set());
    expect(parseHiddenJobIds('not json')).toEqual(new Set());
    expect(parseHiddenJobIds('{"a":1}')).toEqual(new Set());
    expect(parseHiddenJobIds('["a", 1, null]')).toEqual(new Set(['a']));
  });
});
