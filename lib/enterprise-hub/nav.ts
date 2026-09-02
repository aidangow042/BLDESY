/**
 * lib/enterprise-hub/nav.ts — the Enterprise Hub navigation table.
 *
 * Port of the `navItems` / `mobileTabIndices` / `mobileMoreIndices` /
 * `isActive` block in ~/bldesy-web/app/enterprise/enterprise-shell.tsx.
 * Order and labels are the website's; the "Demo" walkthrough trigger is
 * web-only (a spotlight tour over the desktop sidebar) and has no app twin.
 *
 * Hrefs derive from lib/routes.ts so the hub's screens keep mirroring
 * `/enterprise/*`. Pure — no React Native imports.
 */
import type { Href } from 'expo-router';

import { ROUTES } from '@/lib/routes';

/** Ionicons names used by the hub nav (heroicons-outline equivalents). */
export type EnterpriseNavIcon =
  | 'grid-outline'
  | 'briefcase-outline'
  | 'document-text-outline'
  | 'bar-chart-outline'
  | 'add-circle-outline'
  | 'create-outline'
  | 'person-outline'
  | 'eye-outline'
  | 'card-outline'
  | 'settings-outline'
  | 'log-out-outline';

export interface EnterpriseNavItem {
  href: string;
  label: string;
  /** Match the pathname exactly (Dashboard). */
  exact?: boolean;
  /** Indigo-tinted row (Exit Dashboard). */
  accent?: boolean;
  /** Hairline above the row in the More sheet. */
  dividerBefore?: boolean;
  icon: EnterpriseNavIcon;
}

/** The web's `/enterprise/profile` placeholder — swapped for the real public profile URL at render. */
export const ENTERPRISE_PROFILE_PLACEHOLDER = '/enterprise/profile';

/** "My Contracts" — the jobs screen with the contract filter. */
export const ENTERPRISE_CONTRACTS_HREF = `${ROUTES.enterpriseJobs}?kind=contract`;

export const ENTERPRISE_ANALYTICS_HREF = `${ROUTES.enterprise}/analytics`;
export const ENTERPRISE_EDIT_PROFILE_HREF = `${ROUTES.enterprise}/edit-profile`;
export const ENTERPRISE_PROFILE_VISIBILITY_HREF = `${ROUTES.enterprise}/profile-visibility`;
export const ENTERPRISE_BILLING_HREF = `${ROUTES.enterprise}/billing`;
export const ENTERPRISE_SETTINGS_HREF = `${ROUTES.enterprise}/settings`;

export const ENTERPRISE_NAV_ITEMS: readonly EnterpriseNavItem[] = [
  { href: ROUTES.enterprise, label: 'Dashboard', exact: true, icon: 'grid-outline' },
  { href: ROUTES.enterpriseJobs, label: 'My Job Posts', icon: 'briefcase-outline' },
  { href: ENTERPRISE_CONTRACTS_HREF, label: 'My Contracts', icon: 'document-text-outline' },
  { href: ENTERPRISE_ANALYTICS_HREF, label: 'Analytics', icon: 'bar-chart-outline' },
  { href: ROUTES.postJob, label: 'Post a Job', icon: 'add-circle-outline' },
  { href: ENTERPRISE_EDIT_PROFILE_HREF, label: 'Edit Profile', icon: 'create-outline' },
  { href: ENTERPRISE_PROFILE_PLACEHOLDER, label: 'View Profile', icon: 'person-outline' },
  { href: ENTERPRISE_PROFILE_VISIBILITY_HREF, label: 'Profile visibility', icon: 'eye-outline' },
  { href: ENTERPRISE_BILLING_HREF, label: 'Billing & Plans', icon: 'card-outline' },
  { href: ENTERPRISE_SETTINGS_HREF, label: 'Settings', icon: 'settings-outline' },
  { href: ROUTES.home, label: 'Exit Dashboard', accent: true, dividerBefore: true, icon: 'log-out-outline' },
];

/** Resolve by label, not index — inserting a nav item used to silently shift every entry. */
export function navItemsByLabel(labels: readonly string[]): EnterpriseNavItem[] {
  return labels.map((label) => {
    const item = ENTERPRISE_NAV_ITEMS.find((i) => i.label === label);
    if (!item) throw new Error(`Unknown enterprise nav item: ${label}`);
    return item;
  });
}

/** Mobile: 4 quick tabs + a "More" sheet for everything else (web order). */
export const MOBILE_TAB_ITEMS: readonly EnterpriseNavItem[] = navItemsByLabel([
  'Dashboard',
  'My Job Posts',
  'Analytics',
  'Billing & Plans',
]);

export const MOBILE_MORE_ITEMS: readonly EnterpriseNavItem[] = navItemsByLabel([
  'My Contracts',
  'Post a Job',
  'Edit Profile',
  'View Profile',
  'Profile visibility',
  'Settings',
  'Exit Dashboard',
]);

/** The shortened tab-bar captions ("Jobs", "Billing"). */
export function mobileTabLabel(label: string): string {
  if (label === 'My Job Posts') return 'Jobs';
  if (label === 'Billing & Plans') return 'Billing';
  return label;
}

/** Replace the `/enterprise/profile` placeholder with the actual public profile URL. */
export function resolveNavHref(href: string, userId: string): string {
  return href === ENTERPRISE_PROFILE_PLACEHOLDER ? ROUTES.companyProfile(userId) : href;
}

/**
 * The shell's `isActive`: exact for the dashboard; "My Job Posts" vs "My
 * Contracts" both point at /enterprise/jobs and differ by `?kind=contract`;
 * everything else matches the path or a child of it.
 */
export function isNavItemActive(
  href: string,
  pathname: string,
  kind: string | null | undefined,
  exact?: boolean,
): boolean {
  if (exact) return pathname === href;
  if (href === ENTERPRISE_CONTRACTS_HREF) {
    return pathname === ROUTES.enterpriseJobs && kind === 'contract';
  }
  if (href === ROUTES.enterpriseJobs) {
    return pathname === ROUTES.enterpriseJobs && kind !== 'contract';
  }
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Route strings from lib/routes.ts widen to `string`; expo-router's typed
 * `Href` union only knows the routes in the last generated declaration file.
 * One cast site instead of `as any` on every push.
 */
export function toHref(path: string): Href {
  return path as Href;
}
