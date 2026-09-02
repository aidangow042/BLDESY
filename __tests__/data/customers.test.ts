import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '@/lib/api';
import {
  CUSTOMER_FIRST_NAME_REQUIRED,
  CUSTOMER_SUBURB_REQUIRED,
  HOMEOWNER_LABELS,
  PROPERTY_LABELS,
  buildCustomerProfileRow,
  getCustomerProfile,
  resolveCustomerDashboardIdentity,
  validateCustomerProfileInput,
} from '@/lib/data/customers';

vi.mock('@/lib/api', () => import('./mocks/api-mock'));
vi.mock('@/lib/supabase', () => import('./mocks/supabase-mock'));

const get = api.get as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  get.mockReset();
});

describe('labels', () => {
  it('are the website strings verbatim', () => {
    expect(HOMEOWNER_LABELS).toEqual({ 'owner-occupier': 'Owner-occupier', investor: 'Investor', 'property-manager': 'Property manager' });
    expect(PROPERTY_LABELS).toEqual({ house: 'House', unit: 'Unit', commercial: 'Commercial' });
  });
});

describe('validateCustomerProfileInput / buildCustomerProfileRow', () => {
  const base = { first_name: ' Sam ', suburb: ' Newtown ', bio: '  ', homeowner_type: 'investor' as const, property_type: 'unit' as const };

  it('requires first name then suburb, with the editor copy', () => {
    expect(validateCustomerProfileInput({ ...base, first_name: ' ' })).toBe(CUSTOMER_FIRST_NAME_REQUIRED);
    expect(validateCustomerProfileInput({ ...base, suburb: '' })).toBe(CUSTOMER_SUBURB_REQUIRED);
    expect(validateCustomerProfileInput(base)).toBeNull();
  });

  it('builds the upsert row keyed by the auth user id, blank bio → null', () => {
    expect(buildCustomerProfileRow('u1', base)).toEqual({
      id: 'u1',
      first_name: 'Sam',
      suburb: 'Newtown',
      bio: null,
      homeowner_type: 'investor',
      property_type: 'unit',
      avatar_url: null,
    });
    expect(buildCustomerProfileRow('u1', { ...base, bio: ' Hi ', avatar_url: 'https://x/a.png' })).toMatchObject({ bio: 'Hi', avatar_url: 'https://x/a.png' });
  });
});

describe('resolveCustomerDashboardIdentity', () => {
  it('prefers the customer profile', () => {
    expect(
      resolveCustomerDashboardIdentity({
        customerProfile: { first_name: 'Sam', suburb: 'Newtown', avatar_url: 'https://x/c.png' },
        baseProfile: { name: 'Samuel', avatar_url: 'https://x/b.png' },
        user: { email: 'sam@example.com', user_metadata: { name: 'S' } },
      }),
    ).toEqual({ displayName: 'Sam', subtitle: 'Newtown', avatarUrl: 'https://x/c.png' });
  });

  it('falls back through base profile → metadata → email → "Your account"', () => {
    expect(
      resolveCustomerDashboardIdentity({ customerProfile: null, baseProfile: { name: 'Samuel', avatar_url: null }, user: { email: 'sam@example.com', user_metadata: {} } }),
    ).toEqual({ displayName: 'Samuel', subtitle: 'Customer', avatarUrl: null });
    expect(
      resolveCustomerDashboardIdentity({ customerProfile: null, baseProfile: null, user: { email: 'sam@example.com', user_metadata: { name: 'Meta' } } }),
    ).toMatchObject({ displayName: 'Meta' });
    expect(resolveCustomerDashboardIdentity({ customerProfile: null, baseProfile: null, user: { email: 'sam@example.com', user_metadata: {} } })).toMatchObject({
      displayName: 'sam@example.com',
    });
    // Phone-only accounts have email "" — `||` must skip it.
    expect(resolveCustomerDashboardIdentity({ customerProfile: null, baseProfile: null, user: { email: '', user_metadata: {} } })).toMatchObject({
      displayName: 'Your account',
    });
  });
});

describe('getCustomerProfile', () => {
  it('returns the trust profile, null on the deliberately ambiguous 404, rethrows other errors', async () => {
    const profile = { first_name: 'Sam', suburb: 'Newtown', avatar_url: null, bio: null, homeowner_type: 'investor', property_type: 'unit', member_since: '2026-01-01', email_verified: true, phone_verified: false };
    get.mockResolvedValue(profile);
    await expect(getCustomerProfile('c1')).resolves.toEqual(profile);
    expect(get).toHaveBeenCalledWith('/api/customers/c1/profile');
    get.mockRejectedValue(new ApiError(404, 'No profile'));
    await expect(getCustomerProfile('c1')).resolves.toBeNull();
    get.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    await expect(getCustomerProfile('c1')).rejects.toMatchObject({ status: 401 });
  });
});
