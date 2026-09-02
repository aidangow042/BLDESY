/**
 * Portal navigation — the `navItems` / `mobileTabItems` / `mobileMoreItems`
 * tables from `~/bldesy-web/app/portal/portal-shell.tsx`, resolved by label
 * (never by index) exactly as the web does. Icons are the closest Ionicons to
 * the web's heroicons-outline set.
 *
 * The web's "Demo" entry starts the PortalWalkthrough tour, which is not part
 * of the native portal, so it is not listed here.
 */
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import { STAGE2_JOBS_LIVE } from '@/lib/launch-flags';
import { ROUTES } from '@/lib/routes';
import { STAGE2_BADGE } from '@/lib/web/stage2';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface PortalNavItem {
  label: string;
  href: string;
  icon: IoniconName;
  /** Active only on an exact pathname match (Dashboard). */
  exact?: boolean;
  /** Stage 2 pill while the business side is not live. */
  badge?: string;
  /** Exit Portal — rendered in primary at 80%. */
  accent?: boolean;
}

const stage2Badge = STAGE2_JOBS_LIVE ? undefined : STAGE2_BADGE;

export const PORTAL_NAV_ITEMS: readonly PortalNavItem[] = [
  { label: 'Dashboard', href: ROUTES.portal, icon: 'grid-outline', exact: true },
  { label: 'Edit Profile', href: ROUTES.portalEditProfile, icon: 'person-outline' },
  { label: 'Availability', href: ROUTES.portalAvailability, icon: 'calendar-outline' },
  { label: 'Profile visibility', href: ROUTES.portalProfileVisibility, icon: 'eye-outline' },
  { label: 'Project Jobs', href: ROUTES.portalJobsCommercial, icon: 'business-outline', badge: stage2Badge },
  { label: 'Home Jobs', href: ROUTES.portalJobsResidential, icon: 'home-outline' },
  { label: 'Contracts', href: ROUTES.portalJobsContracts, icon: 'document-text-outline', badge: stage2Badge },
  { label: 'Applications', href: ROUTES.portalApplications, icon: 'clipboard-outline' },
  { label: 'Analytics', href: ROUTES.portalAnalytics, icon: 'bar-chart-outline' },
  { label: 'Refer & Earn', href: ROUTES.portalRefer, icon: 'gift-outline' },
  { label: 'Messages', href: ROUTES.portalMessages, icon: 'chatbubble-ellipses-outline' },
  { label: 'Billing', href: ROUTES.portalBilling, icon: 'card-outline' },
  { label: 'Settings', href: ROUTES.portalSettings, icon: 'settings-outline' },
  { label: 'Exit Portal', href: ROUTES.home, icon: 'log-out-outline', accent: true },
];

// Resolve by label, not index — inserting a nav item used to silently shift
// every mobile entry.
export function portalNavItem(label: string): PortalNavItem {
  const item = PORTAL_NAV_ITEMS.find((i) => i.label === label);
  if (!item) throw new Error(`Unknown portal nav item: ${label}`);
  return item;
}

// Project Jobs sits out of the prime mobile slots while it's a Stage 2
// teaser — Home Jobs (the live feed) takes its place until then.
export const PORTAL_TAB_ITEMS: readonly PortalNavItem[] = [
  'Dashboard',
  'Home Jobs',
  'Applications',
  'Messages',
].map(portalNavItem);

// Items shown only in the "More" sheet (everything not in PORTAL_TAB_ITEMS above)
export const PORTAL_MORE_ITEMS: readonly PortalNavItem[] = [
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
].map(portalNavItem);

/** The web shell's isActiveLink(): exact, or the pathname sits under the href. */
export function isPortalLinkActive(pathname: string, item: Pick<PortalNavItem, 'href' | 'exact'>): boolean {
  const href = item.href.split('?')[0];
  if (item.exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}
