/**
 * /dashboard — the customer dashboard shell. Port of
 * ~/bldesy-web/app/dashboard/layout.tsx + components/dashboard/dashboard-shell.tsx:
 * every route under /dashboard requires auth (guests bounce to login), the
 * tabs are `Profile · My Jobs · Saved · Messages · Exit` on the dark amber
 * bar. Each tab renders its own AppShell + "My Dashboard" strip via
 * components/customer-dashboard/dashboard-screen.tsx, so the global header
 * and AI launcher sit inside the scene above this bar.
 */
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Tabs, useRouter, type Href } from 'expo-router';

import { DashboardIdentityProvider } from '@/components/customer-dashboard/dashboard-identity';
import { DashboardTabBar } from '@/components/customer-dashboard/dashboard-tab-bar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { ROUTES } from '@/lib/routes';

export const unstable_settings = {
  initialRouteName: 'profile',
};

export default function DashboardLayout() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { authedUser, loading } = useUser();

  useEffect(() => {
    if (!loading && !authedUser) router.replace(ROUTES.login as Href);
  }, [loading, authedUser, router]);

  if (loading || !authedUser) {
    return (
      <View style={[styles.loading, { backgroundColor: c.canvas }]}>
        <ActivityIndicator color={c.cta} />
      </View>
    );
  }

  return (
    <DashboardIdentityProvider user={authedUser}>
      <Tabs
        tabBar={(props) => <DashboardTabBar {...props} />}
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          lazy: true,
          sceneStyle: { backgroundColor: c.canvas },
        }}
      >
        {/* /dashboard itself redirects to /dashboard/profile — hidden from the bar. */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="jobs" options={{ title: 'My Jobs' }} />
        <Tabs.Screen name="saved" options={{ title: 'Saved Tradies' }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      </Tabs>
    </DashboardIdentityProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
