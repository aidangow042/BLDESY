import { describe, expect, it, vi } from 'vitest';

import {
  addChip,
  addProjectVideo,
  buildEnterpriseProfileUpdate,
  emptyPastProject,
  ENTERPRISE_EDIT_STEPS,
  enterpriseEditFormFrom,
  ERR_COMPANY_NAME_REQUIRED,
  ERR_MAX_PROJECT_VIDEOS,
  ERR_POSTCODE_FORMAT,
  MAX_PROJECT_VIDEOS,
  removeChip,
  removeProjectVideo,
  SUGGESTED_REGIONS,
  suggestedRegionsFor,
  toggleTradeNeeded,
  uploadFailedMessage,
  validateEnterpriseEditForm,
  type EnterpriseEditSource,
} from '@/lib/enterprise-hub/edit-profile';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

const source: EnterpriseEditSource = {
  company_name: 'Acme Build',
  abn: null,
  bio: 'We build.',
  company_size: '11-50',
  industry_focus: null,
  logo_url: 'https://x/logo.png',
  cover_photo_url: null,
  suburb: 'Newtown',
  postcode: '2042',
  service_regions: ['Sydney'],
  specialties: null,
  certifications: ['ISO 45001'],
  years_established: 15,
  team_size: null,
  safety_record: null,
  insurance_details: null,
  trades_needed: ['plumber'],
  past_projects: null,
  website: null,
  contact_name: 'Sam',
  contact_phone: '0412 345 678',
  contact_email: null,
};

describe('steps + constants', () => {
  it('web labels and caps', () => {
    expect(ENTERPRISE_EDIT_STEPS).toEqual(['Basics', 'Location', 'Credentials', 'Projects', 'Contact']);
    expect(MAX_PROJECT_VIDEOS).toBe(3);
    expect(SUGGESTED_REGIONS.slice(0, 3)).toEqual(['Sydney', 'Newcastle', 'Wollongong']);
    expect(SUGGESTED_REGIONS).toContain('All of QLD');
    expect(uploadFailedMessage('boom')).toBe('Upload failed: boom');
  });
});

describe('enterpriseEditFormFrom', () => {
  it('hydrates like the page (blanks, numbers as strings, lists default [])', () => {
    const f = enterpriseEditFormFrom(source);
    expect(f.companyName).toBe('Acme Build');
    expect(f.abn).toBe('');
    expect(f.companySize).toBe('11-50');
    expect(f.yearsEstablished).toBe('15');
    expect(f.teamSize).toBe('');
    expect(f.specialties).toEqual([]);
    expect(f.certifications).toEqual(['ISO 45001']);
    expect(f.pastProjects).toEqual([]);
    expect(f.contactEmail).toBe('');
  });
});

describe('validateEnterpriseEditForm', () => {
  const f = enterpriseEditFormFrom(source);
  it('company name then postcode', () => {
    expect(validateEnterpriseEditForm(f)).toBeNull();
    expect(validateEnterpriseEditForm({ ...f, companyName: '  ' })).toBe(ERR_COMPANY_NAME_REQUIRED);
    expect(validateEnterpriseEditForm({ ...f, postcode: '20' })).toBe(ERR_POSTCODE_FORMAT);
    expect(validateEnterpriseEditForm({ ...f, postcode: '' })).toBeNull();
  });
});

describe('buildEnterpriseProfileUpdate', () => {
  it('trims, nulls blanks and empty lists, drops untitled projects, stamps updated_at', () => {
    const f = enterpriseEditFormFrom(source);
    f.pastProjects = [{ ...emptyPastProject(), title: 'Tower' }, emptyPastProject()];
    f.website = '  https://acme.com.au ';
    const now = new Date('2026-08-31T00:00:00Z');
    const patch = buildEnterpriseProfileUpdate(f, now);
    expect(patch.company_name).toBe('Acme Build');
    expect(patch.abn).toBeNull();
    expect(patch.company_size).toBe('11-50');
    expect(patch.specialties).toBeNull();
    expect(patch.years_established).toBe(15);
    expect(patch.team_size).toBeNull();
    expect(patch.past_projects).toHaveLength(1);
    expect(patch.website).toBe('https://acme.com.au');
    expect(patch.updated_at).toBe(now.toISOString());
    expect('credentials_verified' in patch).toBe(false);
  });
  it('omits company_size when unchosen (NOT NULL column)', () => {
    const f = { ...enterpriseEditFormFrom(source), companySize: '' as const };
    expect('company_size' in buildEnterpriseProfileUpdate(f)).toBe(false);
  });
});

describe('chips, regions, trades', () => {
  it('addChip trims + dedupes; removeChip filters', () => {
    expect(addChip(['a'], ' b ')).toEqual(['a', 'b']);
    expect(addChip(['a'], 'a')).toEqual(['a']);
    expect(addChip(['a'], '   ')).toEqual(['a']);
    expect(removeChip(['a', 'b'], 'a')).toEqual(['b']);
  });
  it('suggestedRegionsFor hides chosen regions case-insensitively', () => {
    expect(suggestedRegionsFor(['sydney', 'All of qld'])).not.toContain('Sydney');
    expect(suggestedRegionsFor(['sydney', 'All of qld'])).not.toContain('All of QLD');
    expect(suggestedRegionsFor([])).toEqual([...SUGGESTED_REGIONS]);
  });
  it('toggleTradeNeeded', () => {
    expect(toggleTradeNeeded(['plumber'], 'plumber')).toEqual([]);
    expect(toggleTradeNeeded([], 'plumber')).toEqual(['plumber']);
  });
});

describe('project videos', () => {
  it('caps at MAX_PROJECT_VIDEOS and never mutates', () => {
    const projects = [{ ...emptyPastProject(), title: 'A', videos: [{ url: '1', poster: null }, { url: '2', poster: null }] }];
    const ok = addProjectVideo(projects, 0, { url: '3', poster: null });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.projects[0].videos).toHaveLength(3);
      expect(projects[0].videos).toHaveLength(2);
      const full = addProjectVideo(ok.projects, 0, { url: '4', poster: null });
      expect(full).toEqual({ ok: false, error: ERR_MAX_PROJECT_VIDEOS });
      expect(removeProjectVideo(ok.projects, 0, 1)[0].videos?.map((v) => v.url)).toEqual(['1', '3']);
    }
    expect(addProjectVideo(projects, 5, { url: 'x', poster: null })).toEqual({ ok: false, error: 'Project not found.' });
  });
});
