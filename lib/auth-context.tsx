/**
 * Shared auth context — single getUser() call on init, shared everywhere.
 * Replaces 64+ redundant supabase.auth.getUser() calls across the app.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
