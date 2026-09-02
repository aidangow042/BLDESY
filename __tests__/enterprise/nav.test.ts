import { describe, expect, it } from 'vitest';

import {
  ENTERPRISE_CONTRACTS_HREF,
  ENTERPRISE_NAV_ITEMS,
  ENTERPRISE_PROFILE_PLACEHOLDER,
  isNavItemActive,
  MOBILE_MORE_ITEMS,
  MOBILE_TAB_ITEMS,
  mobileTabLabel,
  navItemsByLabel,
  resolveNavHref,
} from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';

describe('enterprise nav table (enterprise-shell.tsx)', () => {
  it('keeps the web order and labels', () => {
    expect(ENTERPRISE_NAV_ITEMS.map((i) => i.label)).toEqual([
      'Dashboard',
      'My Job Posts',
      'My Contracts',
      'Analytics',
      'Post a Job',
      'Edit Profile',
      'View Profile',
      'Profile visibility',
      'Billing & Plans',
      'Settings',
      'Exit Dashboard',
    ]);
  });
  it('mobile split: 4 tabs + the More sheet, resolved by label', () => {
    expect(MOBILE_TAB_ITEMS.map((i) => i.label)).toEqual(['Dashboard', 'My Job Posts', 'Analytics', 'Billing & Plans']);
    expect(MOBILE_MORE_ITEMS.map((i) => i.label)).toEqual([
      'My Contracts',
      'Post a Job',
      'Edit Profile',
      'View Profile',
      'Profile visibility',
      'Settings',
      'Exit Dashboard',
    ]);
    expect(() => navItemsByLabel(['Nope'])).toThrow('Unknown enterprise nav item: Nope');
  });
  it('shortens the tab captions', () => {
    expect(mobileTabLabel('My Job Posts')).toBe('Jobs');
    expect(mobileTabLabel('Billing & Plans')).toBe('Billing');
    expect(mobileTabLabel('Analytics')).toBe('Analytics');
  });
  it('hrefs mirror the website paths', () => {
    expect(ROUTES.enterprise).toBe('/enterprise');
    expect(ROUTES.enterpriseJobs).toBe('/enterprise/jobs');
    expect(ROUTES.enterpriseJob('abc')).toBe('/enterprise/jobs/abc');
    expect(ROUTES.enterprisePending).toBe('/enterprise/pending');
    expect(ENTERPRISE_CONTRACTS_HREF).toBe('/enterprise/jobs?kind=contract');
    expect(resolveNavHref(ENTERPRISE_PROFILE_PLACEHOLDER, 'u1')).toBe(ROUTES.companyProfile('u1'));
    expect(resolveNavHref('/enterprise/billing', 'u1')).toBe('/enterprise/billing');
  });
});

describe('isNavItemActive', () => {
  it('dashboard is exact', () => {
    expect(isNavItemActive('/enterprise', '/enterprise', null, true)).toBe(true);
    expect(isNavItemActive('/enterprise', '/enterprise/jobs', null, true)).toBe(false);
  });
  it('disambiguates My Job Posts vs My Contracts by ?kind', () => {
    expect(isNavItemActive('/enterprise/jobs', '/enterprise/jobs', undefined)).toBe(true);
    expect(isNavItemActive('/enterprise/jobs', '/enterprise/jobs', 'contract')).toBe(false);
    expect(isNavItemActive(ENTERPRISE_CONTRACTS_HREF, '/enterprise/jobs', 'contract')).toBe(true);
    expect(isNavItemActive(ENTERPRISE_CONTRACTS_HREF, '/enterprise/jobs', null)).toBe(false);
    // The job detail page matches neither (web parity).
    expect(isNavItemActive('/enterprise/jobs', '/enterprise/jobs/abc', null)).toBe(false);
  });
  it('other items match the path or a child of it', () => {
    expect(isNavItemActive('/enterprise/billing', '/enterprise/billing', null)).toBe(true);
    expect(isNavItemActive('/enterprise/billing', '/enterprise/billing/upgrade', null)).toBe(true);
    expect(isNavItemActive('/enterprise/billing', '/enterprise/billingx', null)).toBe(false);
  });
});
