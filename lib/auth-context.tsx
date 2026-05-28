/**
 * Shared auth context — single getUser() call on init, shared everywhere.
 * Replaces 64+ redundant supabase.auth.getUser() calls across the app.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  userId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: null,
  loading: true,
  refresh: async () => {},
});

export function useUser() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user ?? null);
    setLoading(false);
  }

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userId: user?.id ?? null, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export interface UserRoles {
  isCustomer: boolean;
  isBuilder: boolean;
  isEnterprise: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Detect which roles the signed-in user has by checking for the
 * existence of extension-table rows. Mirrors the website's unified
 * profile model — one auth account, additive roles.
 *
 * - Customer = profile row exists (implicit baseline).
 * - Builder  = `builder_profiles` row exists.
 * - Enterprise = `enterprise_profiles` row exists.
 */
export function useRoles(): UserRoles {
  const { userId } = useUser();
  const [roles, setRoles] = useState({ isCustomer: false, isBuilder: false, isEnterprise: false });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setRoles({ isCustomer: false, isBuilder: false, isEnterprise: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ count: profileRows }, { count: builderRows }, { count: enterpriseRows }] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('id', userId),
        supabase.from('builder_profiles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('enterprise_profiles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
    setRoles({
      isCustomer: (profileRows ?? 0) > 0,
      isBuilder: (builderRows ?? 0) > 0,
      isEnterprise: (enterpriseRows ?? 0) > 0,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...roles, loading, refresh: load };
}
