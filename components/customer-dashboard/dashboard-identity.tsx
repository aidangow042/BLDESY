/**
 * Dashboard identity — the sidebar summary the website's dashboard layout
 * computes server-side (~/bldesy-web/app/dashboard/layout.tsx): customer
 * profile → base profile → auth metadata / email → "Your account". Shared by
 * every dashboard tab through context; re-fetched whenever a screen fires
 * `dispatchProfileChanged()` (e.g. after the trust profile is saved).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import {
  getCustomerDashboardIdentity,
  resolveCustomerDashboardIdentity,
  type CustomerDashboardIdentity,
} from '@/lib/data/customers';
import { onProfileChanged } from '@/lib/events/profile';

interface DashboardIdentityValue {
  identity: CustomerDashboardIdentity;
  refresh: () => Promise<void>;
}

const DashboardIdentityContext = createContext<DashboardIdentityValue | null>(null);

export function DashboardIdentityProvider({ user, children }: { user: User; children: ReactNode }) {
  const fallback = useMemo(
    () => resolveCustomerDashboardIdentity({ customerProfile: null, baseProfile: null, user }),
    [user],
  );
  const [identity, setIdentity] = useState<CustomerDashboardIdentity>(fallback);

  const refresh = useCallback(async () => {
    try {
      setIdentity(await getCustomerDashboardIdentity(user));
    } catch (e) {
      console.warn('dashboard identity fetch failed', e instanceof Error ? e.message : e);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    return onProfileChanged(refresh);
  }, [refresh]);

  const value = useMemo(() => ({ identity, refresh }), [identity, refresh]);
  return <DashboardIdentityContext.Provider value={value}>{children}</DashboardIdentityContext.Provider>;
}

export function useDashboardIdentity(): DashboardIdentityValue {
  const ctx = useContext(DashboardIdentityContext);
  if (!ctx) throw new Error('useDashboardIdentity must be used inside the /dashboard layout.');
  return ctx;
}
