/** Test double for @/lib/auth-context — a signed-out user. Hooks are not exercised in these tests. */
export function useUser() {
  return {
    session: null,
    user: null,
    authedUser: null,
    userId: null,
    isAnonymous: false,
    loading: false,
    refresh: async () => {},
  };
}
