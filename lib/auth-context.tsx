/**
 * Identity for the whole app — ONE session listener and ONE role fetch per
 * signed-in user, mirroring the website's
 * components/providers/auth-provider.tsx + components/providers/roles-provider.tsx.
 *
 * Role membership is derived from extension-table existence (never
 * profiles.role / user_metadata.role): builder = builder_profiles row (standing
 * via hasPortalAccess), enterprise = enterprise_profiles row, customer = every
 * signed-in user. Anonymous Supabase sessions (the website's no-signup tradie
 * wizard) count as GUESTS everywhere in the app, exactly as the web header and
 * proxy treat them.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { db, supabase } from '@/lib/supabase';
import { onProfileChanged } from '@/lib/events/profile';
import { hasPortalAccess } from '@/lib/web/billing/plan-state';
import { ROUTES } from '@/lib/routes';
import type { BuilderStatus, PlanState } from '@/types/database';

/* ───────────────────────────── Auth (session) ───────────────────────────── */

interface AuthContextValue {
  /** undefined = still resolving the persisted session (keep the splash up). */
  session: Session | null | undefined;
  /** Raw Supabase user, including anonymous sessions. */
  user: User | null;
  /** The user when it is a real, contactable account; null for guests AND anonymous sessions. */
  authedUser: User | null;
  /** Convenience: authedUser?.id — what owner-scoped queries key on. */
  userId: string | null;
  isAnonymous: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: undefined,
  user: null,
  authedUser: null,
  userId: null,
  isAnonymous: false,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const isAnonymous = user?.is_anonymous === true;
    const authedUser = user && !isAnonymous ? user : null;
    return {
      session,
      user,
      authedUser,
      userId: authedUser?.id ?? null,
      isAnonymous,
      loading: session === undefined,
      refresh,
    };
  }, [session, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Session + user. `userId` is null for guests and anonymous sessions. */
export function useUser(): AuthContextValue {
  return useContext(AuthContext);
}

/* ────────────────────────────── Roles ────────────────────────────── */

/** Web RoleStatus: null = still loading. "approved" = passes the portal-access rule. */
export type RoleStatus = 'none' | 'pending' | 'approved' | null;

export interface RolesState {
  builderStatus: RoleStatus;
  enterpriseStatus: RoleStatus;
  isAdmin: boolean;
  avatarUrl: string | null;
  /** Any builder_profiles row exists (pending or approved). */
  isTradie: boolean;
  /** Own builder row facts the shells branch on (banners, gates). */
  builderRowStatus: BuilderStatus | null;
  planState: PlanState | null;
  loading: boolean;
  refresh: () => void;
  /** Legacy shape kept for the screens awaiting rewrite (customer = any signed-in account). */
  isCustomer: boolean;
  isBuilder: boolean;
  isEnterprise: boolean;
}

const ROLES_INITIAL: RolesState = {
  builderStatus: null,
  enterpriseStatus: null,
  isAdmin: false,
  avatarUrl: null,
  isTradie: false,
  builderRowStatus: null,
  planState: null,
  loading: true,
  refresh: () => {},
  isCustomer: false,
  isBuilder: false,
  isEnterprise: false,
};

const ROLES_GUEST: RolesState = {
  ...ROLES_INITIAL,
  builderStatus: 'none',
  enterpriseStatus: 'none',
  loading: false,
};

const RolesContext = createContext<RolesState>(ROLES_INITIAL);

export function RolesProvider({ children }: { children: ReactNode }) {
  const { authedUser, loading: authLoading } = useUser();
  const [state, setState] = useState<RolesState>(ROLES_INITIAL);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (authLoading) return;
    if (!authedUser) {
      setState({ ...ROLES_GUEST, refresh });
      return;
    }
    let mounted = true;
    const user = authedUser;

    async function fetchRoles() {
      // Errors are swallowed on purpose — identity chrome must never crash a
      // screen; guest defaults stand until a fetch succeeds.
      const [profileRes, builderRes, enterpriseRes] = await Promise.allSettled([
        db.from('profiles').select('avatar_url, is_admin').eq('id', user.id).maybeSingle(),
        db.from('builder_profiles').select('status, plan_state').eq('user_id', user.id).maybeSingle(),
        db.from('enterprise_profiles').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!mounted) return;

      const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
      const builder =
        builderRes.status === 'fulfilled'
          ? (builderRes.value.data as { status: BuilderStatus; plan_state: PlanState | null } | null)
          : null;
      const enterprise =
        enterpriseRes.status === 'fulfilled'
          ? (enterpriseRes.value.data as { status: string } | null)
          : null;

      const builderStatus: RoleStatus = !builder ? 'none' : hasPortalAccess(builder) ? 'approved' : 'pending';
      const enterpriseStatus: RoleStatus = !enterprise
        ? 'none'
        : enterprise.status === 'active' || enterprise.status === 'approved'
          ? 'approved'
          : 'pending';

      setState({
        builderStatus,
        enterpriseStatus,
        isAdmin: Boolean(profile?.is_admin),
        avatarUrl: profile?.avatar_url || (user.user_metadata?.avatar_url as string | undefined) || null,
        isTradie: !!builder,
        builderRowStatus: builder?.status ?? null,
        planState: builder?.plan_state ?? null,
        loading: false,
        refresh,
        isCustomer: true,
        isBuilder: !!builder,
        isEnterprise: !!enterprise,
      });
    }

    setState((s) => ({ ...s, loading: true, refresh }));
    fetchRoles();
    const cleanup = onProfileChanged(fetchRoles);
    return () => {
      mounted = false;
      cleanup();
    };
  }, [authedUser, authLoading, tick, refresh]);

  return <RolesContext.Provider value={state}>{children}</RolesContext.Provider>;
}

/** Who the signed-in user is, role-wise. Guests get `builderStatus === 'none'` with `loading: false`. */
export function useRoles(): RolesState {
  return useContext(RolesContext);
}

/* ────────────────────────── Post-auth routing ────────────────────────── */

/**
 * Set by the signup screens right before/after `auth.signUp` so the first
 * post-auth route is the one-time /welcome role picker (the website reaches it
 * from the email-confirm / OAuth callbacks). Consumed once by the root layout.
 */
export const freshSignup = { pending: false };

/**
 * Where a just-signed-in user lands — the app twin of the website's
 * lib/auth/post-auth.ts ensureProfileAndResolveDest (minus the waitlist gate,
 * which the app does not have): builder → portal (the portal shell handles
 * pending), enterprise → hub / pending, no roles → /welcome for a fresh signup,
 * otherwise home.
 */
export function resolvePostAuthDest(
  roles: Pick<RolesState, 'isTradie' | 'enterpriseStatus'>,
  opts: { freshSignup?: boolean } = {},
): string {
  if (roles.isTradie) return ROUTES.portal;
  if (roles.enterpriseStatus === 'approved') return ROUTES.enterprise;
  if (roles.enterpriseStatus === 'pending') return ROUTES.enterprisePending;
  return opts.freshSignup ? ROUTES.welcome : ROUTES.home;
}

/**
 * Make sure a `profiles` row exists for a signed-in user (the website does the
 * same upsert in ensureProfileAndResolveDest; Supabase's handle_new_user
 * trigger usually beats us, so this is a defensive no-op most of the time).
 */
export async function ensureProfileRow(user: User): Promise<void> {
  const meta = user.user_metadata ?? {};
  const name =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'User';
  const { error } = await db
    .from('profiles')
    .upsert({ id: user.id, name, avatar_url: (meta.avatar_url as string | undefined) || null });
  if (error) console.warn('profiles upsert failed', error.message);
}
