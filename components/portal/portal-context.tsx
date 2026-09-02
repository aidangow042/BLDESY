/**
 * PortalContext — the app twin of `~/bldesy-web/app/portal/portal-context.tsx`.
 *
 * The portal shell (app/portal/_layout.tsx) owns the tradie's own
 * builder_profiles row and hands it down; every portal screen reads it with
 * `usePortal()` exactly as the website pages do, and calls `refreshProfile()`
 * after a write.
 */
import { createContext, useContext } from 'react';

import type { OwnBuilderProfile } from '@/lib/data/portal';

export interface PortalContextValue {
  profile: OwnBuilderProfile | null;
  refreshProfile: () => Promise<void>;
}

export const PortalContext = createContext<PortalContextValue>({
  profile: null,
  refreshProfile: async () => {},
});

export function usePortal(): PortalContextValue {
  return useContext(PortalContext);
}
