/**
 * EnterpriseContext — the hub's own enterprise_profiles row, shared by every
 * /enterprise/* screen. Port of ~/bldesy-web/app/enterprise/enterprise-context.tsx;
 * the layout provides it from `useOwnEnterpriseProfile()`.
 */
import { createContext, useContext } from 'react';

import type { EnterpriseProfile } from '@/lib/data/enterprise';

export interface EnterpriseContextValue {
  profile: EnterpriseProfile | null;
  /** True until the first own-row read resolves. */
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export const EnterpriseContext = createContext<EnterpriseContextValue>({
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function useEnterprise(): EnterpriseContextValue {
  return useContext(EnterpriseContext);
}
