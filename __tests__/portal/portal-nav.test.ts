import { describe, expect, it } from 'vitest';

import {
  isPortalLinkActive,
  PORTAL_MORE_ITEMS,
  PORTAL_NAV_ITEMS,
  PORTAL_TAB_ITEMS,
  portalNavItem,
} from '@/components/portal/portal-nav';
import { ROUTES } from '@/lib/routes';
import { STAGE2_BADGE, STAGE2_JOBS_LIVE } from '@/lib/web/stage2';

describe('portal nav tables (portal-shell.tsx mirror)', () => {
  it('resolves the mobile tab bar by label, in the web order', () => {
    expect(PORTAL_TAB_ITEMS.map((i) => i.label)).toEqual(['Dashboard', 'Home Jobs', 'Applications', 'Messages']);
    expect(PORTAL_TAB_ITEMS.map((i) => i.href)).toEqual([
      ROUTES.portal,
      ROUTES.portalJobsResidential,
      ROUTES.portalApplications,
      ROUTES.portalMessages,
    ]);
  });

  it('lists every remaining item in the More sheet, in the web order', () => {
    expect(PORTAL_MORE_ITEMS.map((i) => i.label)).toEqual([
      'Edit Profile',
      'Availability',
      'Profile visibility',
      'Project Jobs',
      'Contracts',
      'Analytics',
      'Refer & Earn',
      'Billing',
      'Settings',
      'Exit Portal',
    ]);
    // Tab items and More items partition the nav (the web's tour-only "Demo" has no native twin).
    const all = new Set([...PORTAL_TAB_ITEMS, ...PORTAL_MORE_ITEMS].map((i) => i.label));
    expect(all.size).toBe(PORTAL_NAV_ITEMS.length);
  });

  it('badges Project Jobs and Contracts with the Stage 2 pill while the business side is not live', () => {
    const expected = STAGE2_JOBS_LIVE ? undefined : STAGE2_BADGE;
    expect(portalNavItem('Project Jobs').badge).toBe(expected);
    expect(portalNavItem('Contracts').badge).toBe(expected);
    expect(portalNavItem('Home Jobs').badge).toBeUndefined();
  });

  it('throws on an unknown label so a renamed item cannot silently shift the bar', () => {
    expect(() => portalNavItem('Demo')).toThrow('Unknown portal nav item: Demo');
  });

  it('Exit Portal is the accent row pointing home', () => {
    const exit = portalNavItem('Exit Portal');
    expect(exit.accent).toBe(true);
    expect(exit.href).toBe(ROUTES.home);
  });
});

describe('isPortalLinkActive (isActiveLink mirror)', () => {
  it('Dashboard is exact — nested portal routes do not light it up', () => {
    const dashboard = portalNavItem('Dashboard');
    expect(isPortalLinkActive('/portal', dashboard)).toBe(true);
    expect(isPortalLinkActive('/portal/billing', dashboard)).toBe(false);
  });

  it('other items match themselves and their children', () => {
    const billing = portalNavItem('Billing');
    expect(isPortalLinkActive('/portal/billing', billing)).toBe(true);
    expect(isPortalLinkActive('/portal/billing/upgrade', billing)).toBe(true);
    expect(isPortalLinkActive('/portal/billing-history', billing)).toBe(false);
    expect(isPortalLinkActive('/portal/settings', billing)).toBe(false);
  });

  it('Home Jobs is active on the residential feed but not on the commercial one', () => {
    const home = portalNavItem('Home Jobs');
    expect(isPortalLinkActive('/portal/jobs/residential', home)).toBe(true);
    expect(isPortalLinkActive('/portal/jobs/commercial', home)).toBe(false);
  });
});
