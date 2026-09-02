import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ db: {}, supabase: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: 'test' } } }));

import {
  completenessExtrasFor,
  getPortalStatus,
  OWN_PROFILE_COLUMNS,
  OWN_PROFILE_SELECT,
  planStateBanner,
  portalStatusInputFor,
  recentActivityFrom,
  summariseApplications,
  type PortalStatusProfile,
} from '@/lib/data/portal';

const readyProfile: PortalStatusProfile = {
  status: 'approved',
  search_paused_at: null,
  credentials: null,
  credentials_verified: { abn: { number: '1', verified: true, verified_at: null, entity_name: 'X', status: 'Active' } },
  service_areas: ['region:Inner City / CBD'],
  profile_photo_url: null,
  display_images: ['https://cdn/x.jpg'],
  // completeness fields
  business_name: 'Test Trades',
  trade_category: 'plumber',
  suburb: 'Newtown',
  bio: 'x'.repeat(60),
  phone: '0412345678',
  email: 'a@b.co',
  website: 'https://x',
  cover_photo_url: 'https://cdn/c.jpg',
  abn: '123',
  license_key: 'L1',
  projects: [{}],
  team_members: [{}],
  faqs: [{}],
};

describe('OWN_PROFILE_SELECT', () => {
  it('is the comma-joined column list with no duplicates', () => {
    expect(new Set(OWN_PROFILE_COLUMNS).size).toBe(OWN_PROFILE_COLUMNS.length);
    expect(OWN_PROFILE_SELECT.split(', ')).toEqual([...OWN_PROFILE_COLUMNS]);
    expect(OWN_PROFILE_COLUMNS).toContain('plan_state');
    expect(OWN_PROFILE_COLUMNS).toContain('qualified_contact_count');
    expect(OWN_PROFILE_COLUMNS).toContain('display_images');
  });
});

describe('completenessExtrasFor', () => {
  it('phone-only accounts (email "") get no extra', () => {
    expect(completenessExtrasFor({ email: '', email_confirmed_at: undefined })).toBeUndefined();
    expect(completenessExtrasFor(null)).toBeUndefined();
  });
  it('email accounts carry the confirmed flag', () => {
    expect(completenessExtrasFor({ email: 'a@b.co', email_confirmed_at: '2026-01-01' })).toEqual({
      emailVerified: true,
    });
    expect(completenessExtrasFor({ email: 'a@b.co', email_confirmed_at: undefined })).toEqual({
      emailVerified: false,
    });
  });
});

describe('portalStatusInputFor / getPortalStatus', () => {
  it('mirrors the status card: ABN pillar, display images count as a photo, live mode', () => {
    const input = portalStatusInputFor(readyProfile, { email: 'a@b.co', email_confirmed_at: 'x' });
    expect(input.credentialsVerified).toBe(true);
    expect(input.hasPhoto).toBe(true);
    expect(input.hasServiceArea).toBe(true);
    expect(input.hasEmail).toBe(true);
    expect(input.emailVerified).toBe(true);
    expect(input.launchMode).toBe('live');
    expect(input.completeness).toBeGreaterThanOrEqual(60);
    expect(getPortalStatus(readyProfile, { email: 'a@b.co', email_confirmed_at: 'x' }).state).toBe('live');
  });

  it('phone-only accounts are exempt from the email check', () => {
    const r = getPortalStatus(readyProfile, { email: '', email_confirmed_at: undefined });
    expect(r.state).toBe('live');
  });

  it('falls back to the legacy credentials flag and flags missing photo', () => {
    const input = portalStatusInputFor(
      {
        ...readyProfile,
        credentials_verified: null,
        credentials: { abn_verified: false, license_verified: true, insurance_verified: false, memberships: [] },
        display_images: [],
      },
      null,
    );
    expect(input.credentialsVerified).toBe(false);
    expect(input.hasPhoto).toBe(false);
    expect(getPortalStatus({ ...readyProfile, display_images: null }, null).state).toBe('needs_attention');
  });

  it('paused wins over everything but suspended', () => {
    expect(getPortalStatus({ ...readyProfile, search_paused_at: '2026-08-01T00:00:00Z' }, null).state).toBe(
      'paused',
    );
    expect(
      getPortalStatus({ ...readyProfile, status: 'suspended', search_paused_at: '2026-08-01T00:00:00Z' }, null)
        .state,
    ).toBe('suspended');
  });
});

describe('summariseApplications', () => {
  const apps = [
    { id: '1', status: 'accepted', created_at: '2026-08-01', job_id: 'j1' },
    { id: '2', status: 'pending', created_at: '2026-08-02', job_id: 'j2' },
    { id: '3', status: 'rejected', created_at: '2026-08-03', job_id: 'j3' },
    { id: '4', status: 'accepted', created_at: '2026-08-04', job_id: 'j1' },
  ];
  it('counts by status and rates accepted over TOTAL (the dashboard page rule)', () => {
    expect(summariseApplications(apps)).toEqual({
      totalApplications: 4,
      accepted: 2,
      pending: 1,
      rejected: 1,
      acceptanceRate: 50,
    });
  });
  it('is 0% with no applications', () => {
    expect(summariseApplications([]).acceptanceRate).toBe(0);
  });
});

describe('recentActivityFrom', () => {
  const apps = Array.from({ length: 10 }, (_, i) => ({
    id: `a${i}`,
    status: 'pending',
    created_at: `2026-08-${String(10 - i).padStart(2, '0')}`,
    job_id: i === 0 ? 'known' : 'missing',
  }));
  it('takes the newest 8 and resolves titles, null when the job is gone', () => {
    const feed = recentActivityFrom(apps, {
      known: { id: 'known', title: 'Fix tap', trade_category: 'plumber', suburb: 'Newtown' },
    });
    expect(feed).toHaveLength(8);
    expect(feed[0]).toMatchObject({ applicationId: 'a0', jobTitle: 'Fix tap', status: 'pending' });
    expect(feed[1].jobTitle).toBeNull();
  });
});

describe('planStateBanner', () => {
  it('only paused and past_due show a shell banner', () => {
    expect(planStateBanner({ plan_state: 'paused' })).toBe('paused');
    expect(planStateBanner({ plan_state: 'past_due' })).toBe('past_due');
    expect(planStateBanner({ plan_state: 'free' })).toBeNull();
    expect(planStateBanner(null)).toBeNull();
  });
});
