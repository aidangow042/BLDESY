/**
 * /portal — the tradie portal shell. Port of `~/bldesy-web/app/portal/layout.tsx`
 * + `portal-shell.tsx` (MOBILE branch): the server-side guards become client
 * logic here, the shell chrome is the dark header (wordmark + notification
 * bell), the value-gated plan-state banners and the web's own dark bottom tab
 * bar with its "More" sheet. /portal/pending renders WITHOUT the chrome —
 * it's a pre-dashboard surface, exactly as on the web.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type BottomSheet from '@gorhom/bottom-sheet';

import { PlanStateBanner } from '@/components/portal/plan-state-banner';
import { PortalContext } from '@/components/portal/portal-context';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalMoreSheet } from '@/components/portal/portal-more-sheet';
import { PortalTabBar } from '@/components/portal/portal-tab-bar';
import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { getOwnBuilderProfile, planStateBanner, useOwnBuilderProfile } from '@/lib/data/portal';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { hasPortalAccess } from '@/lib/web/billing/plan-state';

export default function PortalLayout() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useUser();
  // user (not authedUser): anonymous-onboarding tradies own real rows and
  // /portal/pending must be able to read them (the "activate" branch).
  const { profile, loading: profileLoading, refresh } = useOwnBuilderProfile();
  const sheetRef = useRef<BottomSheet>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const isPendingRoute = pathname === ROUTES.portalPending;
  // Value-gated billing: every APPROVED tradie gets the portal — free/grace
  // need their leads + meter, past_due needs update-card, paused needs
  // billing + their open conversations. status still gates the approval
  // pipeline (pending_review/rejected/suspended bounce to /portal/pending).
  const hasAccess = !!profile && hasPortalAccess(profile);
  const gating = !!profile && !hasAccess && !isPendingRoute;

  // The proxy bounces unauthenticated requests on the web; guard here too.
  useEffect(() => {
    if (!authLoading && !user) router.replace(ROUTES.login);
  }, [authLoading, user, router]);

  // No portal access → funnel through /portal/pending which renders the
  // right state (verifying / rejected / activation / card step). Verify
  // against a FRESH row first so a stale row never ping-pongs with the
  // pending page, which redirects here off fresh data.
  useEffect(() => {
    if (!profile || hasAccess || isPendingRoute) return;
    let cancelled = false;
    (async () => {
      const fresh = await getOwnBuilderProfile(profile.user_id).catch(() => null);
      if (cancelled) return;
      if (fresh && hasPortalAccess(fresh)) {
        await refresh();
        return;
      }
      router.replace(ROUTES.portalPending);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, hasAccess, isPendingRoute, refresh, router]);

  // Close the "More" sheet on route change
  useEffect(() => {
    sheetRef.current?.close();
  }, [pathname]);

  const refreshProfile = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const contextValue = { profile, refreshProfile };

  /* ── Gates ─────────────────────────────────────────────────────────── */

  if (authLoading || !user || (profileLoading && !profile)) {
    return <LoadingPortal />;
  }

  // No builder profile on THIS account → explain instead of silently dumping
  // them on the join form (anonymous-first onboarding: the application may be
  // attached to another device's session).
  if (!profile) {
    return <NoTradieProfileCard onApplied={refreshProfile} />;
  }

  // Brief spinner while a non-active account is redirected to /portal/pending.
  if (gating) {
    return <LoadingPortal />;
  }

  /* ── Shell ─────────────────────────────────────────────────────────── */

  const banner = isPendingRoute ? null : planStateBanner(profile);

  return (
    <PortalContext.Provider value={contextValue}>
      <View style={[styles.root, { backgroundColor: c.canvas }]}>
        {!isPendingRoute ? <PortalHeader /> : null}
        {banner ? <PlanStateBanner state={banner} /> : null}
        <View style={styles.content}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 150,
              contentStyle: { backgroundColor: c.canvas },
            }}
          />
        </View>
        {!isPendingRoute ? (
          <>
            <PortalTabBar onMore={() => sheetRef.current?.expand()} moreOpen={moreOpen} />
            <PortalMoreSheet ref={sheetRef} profile={profile} onChange={(i) => setMoreOpen(i >= 0)} />
          </>
        ) : null}
      </View>
    </PortalContext.Provider>
  );
}

/* ── Gate screens ────────────────────────────────────────────────────── */

function LoadingPortal() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={[styles.centre, { backgroundColor: c.canvas }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={[styles.loadingText, { color: c.textSecondary }]}>Loading portal...</Text>
    </View>
  );
}

function NoTradieProfileCard({ onApplied }: { onApplied: () => Promise<void> }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function applyAsTradie() {
    await openWebOnboarding('builder');
    // The wizard may have created the row while the browser was open.
    await onApplied();
  }

  async function logInWithDifferentAccount() {
    await supabase.auth.signOut();
    router.replace(ROUTES.login);
  }

  return (
    <View
      style={[
        styles.centre,
        { backgroundColor: c.canvas, paddingTop: insets.top + Spacing['6xl'], paddingHorizontal: Spacing.lg },
      ]}
    >
      <Card padding={Spacing['3xl']} style={styles.noProfileCard}>
        <Text accessibilityRole="header" style={[styles.noProfileTitle, { color: c.textPrimary }]}>
          No tradie profile on this account yet
        </Text>
        <Text style={[styles.noProfileBody, { color: c.textSecondary }]}>
          Already applied? Your application is being reviewed — we&apos;ll email you the moment
          it&apos;s approved. If you applied on another device or browser, it may be attached to
          that session; the approval email includes a link that connects it to your account.
        </Text>
        <View style={styles.noProfileActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void applyAsTradie()}
            style={[styles.noProfileButton, { backgroundColor: c.primary }]}
          >
            <Text style={[styles.noProfileButtonText, { color: '#ffffff' }]}>Apply as a tradie</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void logInWithDifferentAccount()}
            style={[styles.noProfileButton, styles.noProfileButtonOutline, { borderColor: c.border }]}
          >
            <Text style={[styles.noProfileButtonText, { color: c.textPrimary, fontFamily: FontFamily.bodySemiBold }]}>
              Log in with a different account
            </Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  noProfileCard: {
    width: '100%',
    maxWidth: 448, // web max-w-md
    alignItems: 'center',
  },
  noProfileTitle: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  noProfileBody: {
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  noProfileActions: {
    alignSelf: 'stretch',
    marginTop: Spacing['2xl'],
    gap: Spacing.md,
  },
  noProfileButton: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  noProfileButtonOutline: {
    borderWidth: 2,
  },
  noProfileButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
});
