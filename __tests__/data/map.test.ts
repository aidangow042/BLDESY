import { describe, expect, it, vi } from 'vitest';

import { MAP_SELECT, toMapBuilders, type MapBuilderRow } from '@/lib/data/map';

vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));

describe('MAP_SELECT', () => {
  it('is the website column list — user_id first, gated fields included, no billing columns', () => {
    const cols = MAP_SELECT.split(', ');
    expect(cols[0]).toBe('user_id');
    expect(cols).toEqual(
      expect.arrayContaining(['slug', 'latitude', 'longitude', 'phone', 'email', 'bldesy_score', 'next_available_date', 'credentials_verified']),
    );
    expect(cols).toHaveLength(22);
    expect(MAP_SELECT).not.toMatch(/plan_state|subscription_|stripe_/);
  });
});

describe('toMapBuilders', () => {
  it('derives id from user_id and keeps every other field', () => {
    const row = {
      user_id: 'u1',
      slug: 'harbour-city-plumbing',
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
      display_bldesy_score: false,
      response_time: null,
      next_available_date: null,
    } satisfies MapBuilderRow;
    const [pin] = toMapBuilders([row]);
    expect(pin.id).toBe('u1');
    expect(pin.user_id).toBe('u1');
    expect(pin.business_name).toBe('Harbour City Plumbing');
    expect(toMapBuilders([])).toEqual([]);
  });
});
