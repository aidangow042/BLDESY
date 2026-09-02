import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));
vi.mock('expo-file-system', () => ({ File: class {} }));
vi.mock('@/lib/storage', () => ({ uploadImage: vi.fn(async () => null) }));

import {
  addProjectVideo,
  buildBuilderProfileUpdate,
  editProfileFormFrom,
  emptyProject,
  ERR_BUSINESS_NAME_REQUIRED,
  ERR_MAX_PROJECT_VIDEOS,
  ERR_POSTCODE_FORMAT,
  ERR_PRIMARY_AREA_REQUIRED,
  ERR_TRADE_REQUIRED,
  MAX_PROJECT_VIDEOS,
  outsideLaunchAreaMessage,
  removeProjectVideo,
  splitCoverage,
  storagePathFromPublicUrl,
  validateBaseSuburb,
  validateEditProfileForm,
  type EditProfileForm,
  type EditProfileSource,
} from '@/lib/data/profile-edit';

const source: EditProfileSource = {
  business_name: 'Newtown Plumbing',
  phone: '0412 345 678',
  email: null,
  website: null,
  abn: '12345678901',
  bio: 'We fix things.',
  profile_photo_url: null,
  cover_photo_url: null,
  cover_color: null,
  suburb: 'Newtown',
  postcode: '2042',
  availability: 'limited',
  response_time: 'Within 4 hours',
  service_areas: ['Erskineville', 'radius:20km radius', 'region:Lower Inner West', 'region:Sydney', 'cover:upper inner west', 'state:QLD'],
  display_images: null,
  projects: null,
  team_members: null,
  faqs: null,
  trade_category: 'plumber',
  trade_categories: ['plumber', 'gas-fitter'],
  specialisations: { plumber: ['roof-plumber', 'bogus'], electrician: ['residential-electrician'] },
};

describe('splitCoverage', () => {
  it('canonicalises zone names and keeps legacy metro/free text', () => {
    expect(splitCoverage(['lower inner west', 'Sydney', 'Somewhere'], ['UPPER INNER WEST', 'Bondi'])).toEqual({
      primaryZones: ['Lower Inner West'],
      coverZones: ['Upper Inner West'],
      legacy: ['Sydney', 'Somewhere', 'Bondi'],
    });
  });
});

describe('editProfileFormFrom', () => {
  const form = editProfileFormFrom(source);
  it('parses coverage through parseServiceAreas (radius normalised) and splits zones', () => {
    expect(form.serviceRadius).toBe('20');
    expect(form.primaryZones).toEqual(['Lower Inner West']);
    expect(form.coverZones).toEqual(['Upper Inner West']);
    expect(form.legacyRegions).toEqual(['Sydney']);
    expect(form.coverageStates).toEqual(['QLD']);
    expect(form.extraSuburbs).toEqual(['Erskineville']);
  });
  it('sanitises specialisations against the selected trades', () => {
    expect(form.selectedTrades).toEqual(['plumber', 'gas-fitter']);
    expect(form.specialisations).toEqual({ plumber: ['roof-plumber'] });
  });
  it('blanks nulls to "" and arrays to []', () => {
    expect(form.email).toBe('');
    expect(form.projects).toEqual([]);
    expect(form.availability).toBe('limited');
    expect(editProfileFormFrom({ ...source, availability: null as unknown as 'available' }).availability).toBe(
      'available',
    );
  });
});

describe('validateEditProfileForm', () => {
  const valid = editProfileFormFrom(source);
  it('passes a complete form', () => {
    expect(validateEditProfileForm(valid)).toBeNull();
  });
  it('checks in the website order with the website strings', () => {
    expect(validateEditProfileForm({ ...valid, businessName: '  ' })).toBe(ERR_BUSINESS_NAME_REQUIRED);
    expect(validateEditProfileForm({ ...valid, selectedTrades: [] })).toBe(ERR_TRADE_REQUIRED);
    expect(validateEditProfileForm({ ...valid, postcode: '20a2' })).toBe(ERR_POSTCODE_FORMAT);
    expect(validateEditProfileForm({ ...valid, postcode: '' })).toBeNull();
    expect(
      validateEditProfileForm({ ...valid, primaryZones: [], legacyRegions: [], coverageStates: [] }),
    ).toBe(ERR_PRIMARY_AREA_REQUIRED);
    // legacy metro / state claims still count as coverage
    expect(validateEditProfileForm({ ...valid, primaryZones: [], legacyRegions: ['Sydney'] })).toBeNull();
    expect(validateEditProfileForm({ ...valid, primaryZones: [], legacyRegions: [], coverageStates: ['QLD'] })).toBeNull();
  });
});

describe('validateBaseSuburb', () => {
  it('blocks bases outside ~120km of Sydney, passes unresolvable suburbs', () => {
    expect(validateBaseSuburb('Broken Hill', { latitude: -31.95, longitude: 141.45 })).toBe(
      outsideLaunchAreaMessage('Broken Hill'),
    );
    expect(validateBaseSuburb('Newtown', { latitude: -33.8975, longitude: 151.1793 })).toBeNull();
    expect(validateBaseSuburb('Nowhere', null)).toBeNull();
    expect(outsideLaunchAreaMessage('Broken Hill')).toMatch(/within about 120km of Sydney/);
  });
});

describe('buildBuilderProfileUpdate', () => {
  const form: EditProfileForm = {
    ...editProfileFormFrom(source),
    projects: [{ ...emptyProject(), title: 'Deck' }, emptyProject()],
    teamMembers: [
      { name: 'Sam', role: 'Apprentice', photo_url: null },
      { name: '', role: 'x', photo_url: null },
    ],
    faqs: [
      { question: 'Q', answer: 'A' },
      { question: 'Q', answer: '' },
    ],
    email: '',
    website: '',
    coverColor: '#0D9B7A',
    displayImages: [],
  };
  const coords = { latitude: -33.8975, longitude: 151.1793 };
  const payload = buildBuilderProfileUpdate(form, coords);

  it('writes the primary trade + full list and re-sanitises specialisations', () => {
    expect(payload.trade_category).toBe('plumber');
    expect(payload.trade_categories).toEqual(['plumber', 'gas-fitter']);
    expect(payload.specialisations).toEqual({ plumber: ['roof-plumber'] });
  });
  it('blanks become null, empties are dropped, coords + radius carried', () => {
    expect(payload.email).toBeNull();
    expect(payload.website).toBeNull();
    expect(payload.display_images).toBeNull();
    expect(payload.cover_color).toBe('#0D9B7A');
    expect(payload.latitude).toBe(coords.latitude);
    expect(payload.radius_km).toBe(20);
    expect(payload.projects).toHaveLength(1);
    expect(payload.team_members).toEqual([{ name: 'Sam', role: 'Apprentice', photo_url: null }]);
    expect(payload.faqs).toEqual([{ question: 'Q', answer: 'A' }]);
  });
  it('builds service_areas through buildServiceAreas (suburbs, radius, regions, cover, states)', () => {
    expect(payload.service_areas).toEqual([
      'Erskineville',
      'radius:20',
      'region:Lower Inner West',
      'region:Sydney',
      'cover:Upper Inner West',
      'state:QLD',
    ]);
  });
  it('collapses an empty coverage to null and a missing geocode to null coords', () => {
    const bare = buildBuilderProfileUpdate(
      { ...form, extraSuburbs: [], serviceRadius: '', primaryZones: [], legacyRegions: [], coverZones: [], coverageStates: [] },
      null,
    );
    expect(bare.service_areas).toBeNull();
    expect(bare.radius_km).toBeNull();
    expect(bare.latitude).toBeNull();
  });
});

describe('project videos', () => {
  it(`caps at ${MAX_PROJECT_VIDEOS} per project without mutating`, () => {
    const projects = [emptyProject()];
    let r = addProjectVideo(projects, 0, { url: 'v1', poster: null });
    expect(r.ok).toBe(true);
    let list = r.ok ? r.projects : [];
    for (const url of ['v2', 'v3']) {
      r = addProjectVideo(list, 0, { url, poster: null });
      list = r.ok ? r.projects : list;
    }
    expect(list[0].videos).toHaveLength(3);
    const over = addProjectVideo(list, 0, { url: 'v4', poster: null });
    expect(over).toEqual({ ok: false, error: ERR_MAX_PROJECT_VIDEOS });
    expect(projects[0].videos).toEqual([]);
    expect(removeProjectVideo(list, 0, 1)[0].videos?.map((v) => v.url)).toEqual(['v1', 'v3']);
    expect(addProjectVideo(list, 5, { url: 'x', poster: null }).ok).toBe(false);
  });
});

describe('storagePathFromPublicUrl', () => {
  it('recovers the object path inside the bucket', () => {
    expect(
      storagePathFromPublicUrl(
        'https://abc.supabase.co/storage/v1/object/public/builder-media/u1/profile/1700000000.jpg?v=2',
        'builder-media',
      ),
    ).toBe('u1/profile/1700000000.jpg');
    expect(storagePathFromPublicUrl('https://abc.supabase.co/x/y.jpg', 'builder-media')).toBeNull();
    expect(
      storagePathFromPublicUrl('https://abc.supabase.co/storage/v1/object/public/avatars/u1/a%20b.jpg', 'avatars'),
    ).toBe('u1/a b.jpg');
  });
});
