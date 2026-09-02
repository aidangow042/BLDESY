/**
 * /enterprise — the Enterprise Hub shell. Port of
 * ~/bldesy-web/app/enterprise/layout.tsx + enterprise-shell.tsx (mobile):
 *
 *   - no session → login; no enterprise row → /welcome (the business card
 *     there sends new businesses to the website's hiring waitlist — D4: the
 *     app has no business signup of its own);
 *   - not active/approved → /enterprise/pending, which renders WITHOUT the
 *     hub chrome (a pre-dashboard surface for accounts still being verified);
 *   - otherwise the dark `#111318` header (wordmark + NotificationBell), the
 *     screen, the 4-tab bar + "More" sheet, all on the indigo accent.
 *
 * The own enterprise_profiles row is shared with every screen through
 * EnterpriseContext (the web's useEnterprise()).
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';

import { EnterpriseContext } from '@/components/enterprise/enterprise-context';
import { EnterpriseHeader } from '@/components/enterprise/enterprise-header';
import { EnterpriseTabBar } from '@/components/enterprise/enterprise-tab-bar';
import { Spinner, useHubTheme } from '@/components/enterprise/hub-primitives';
import { EnterpriseMoreSheet } from '@/components/enterprise/more-sheet';
import { useRoles, useUser } from '@/lib/auth-context';
import { useOwnEnterpriseProfile } from '@/lib/data/enterprise';
import { toHref } from '@/lib/enterprise-hub/nav';
import { ROUTES } from '@/lib/routes';

export default function EnterpriseLayout() {
  const c = useHubTheme();
  const pathname = usePathname();
  const { authedUser, loading: authLoading } = useUser();
  const roles = useRoles();
  const { profile, loading: profileLoading, refresh } = useOwnEnterpriseProfile();
  const [moreOpen, setMoreOpen] = useState(false);

  const isPendingRoute = pathname === ROUTES.enterprisePending;
  const rolesReady = !roles.loading && roles.enterpriseStatus !== null;

  // The proxy bounces unauthenticated requests on the web; guard here too.
  useEffect(() => {
    if (!authLoading && !authedUser) router.replace(toHref(ROUTES.login));
  }, [authLoading, authedUser]);

  // No enterprise profile → the role picker (web: /list-company).
  useEffect(() => {
    if (authedUser && rolesReady && roles.enterpriseStatus === 'none') router.replace(toHref(ROUTES.welcome));
  }, [authedUser, rolesReady, roles.enterpriseStatus]);

  // Everything in /enterprise/* except /enterprise/pending requires an
  // active/approved enterprise; non-live accounts are funnelled through the
  // pending page, which renders the right status UI.
  useEffect(() => {
    if (authedUser && rolesReady && roles.enterpriseStatus === 'pending' && !isPendingRoute) {
      router.replace(toHref(ROUTES.enterprisePending));
    }
  }, [authedUser, rolesReady, roles.enterpriseStatus, isPendingRoute]);

  // Close the More sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const ctx = useMemo(
    () => ({ profile, loading: profileLoading, refreshProfile: refresh }),
    [profile, profileLoading, refresh],
  );

  // Pending route renders without the enterprise chrome — pre-dashboard.
  if (isPendingRoute) {
    return (
      <EnterpriseContext.Provider value={ctx}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas } }} />
      </EnterpriseContext.Provider>
    );
  }

  const gating =
    authLoading || !authedUser || !rolesReady || roles.enterpriseStatus !== 'approved' || !profile;

  // Brief spinner while a non-live account is being redirected (or the own
  // row is still loading). Live accounts barely see this.
  if (gating) {
    return (
      <View style={[styles.root, { backgroundColor: c.canvas }]}>
        <Spinner label="Loading dashboard..." minHeight={360} />
      </View>
    );
  }

  return (
    <EnterpriseContext.Provider value={ctx}>
      <View style={[styles.root, { backgroundColor: c.canvas }]}>
        <EnterpriseHeader />
        <View style={styles.body}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: c.canvas },
            }}
          />
        </View>
        <EnterpriseTabBar moreOpen={moreOpen} onMorePress={() => setMoreOpen(true)} />
        <EnterpriseMoreSheet
          visible={moreOpen}
          onClose={() => setMoreOpen(false)}
          profile={profile}
          userId={authedUser.id}
        />
      </View>
    </EnterpriseContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
