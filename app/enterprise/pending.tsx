/**
 * /enterprise/pending — the pending-state landing page for enterprises. Port
 * of ~/bldesy-web/app/enterprise/pending/page.tsx, rendered without the hub
 * chrome (the layout skips the shell for this route) but inside the site
 * header like the web.
 *
 * Branches off enterprise_profiles:
 *   - status='pending_review' + no rejection_reason  → "Verifying" (auto-refresh)
 *   - status='pending_review' + rejection_reason     → "Verification failed" + Retry/Edit
 *   - status='rejected'                              → Same as failed
 *   - status='active'/'approved'                     → Redirect to /enterprise
 *   - status='suspended'                             → "Account suspended" + Contact support
 *   - no row                                         → /welcome (web: /list-company)
 *
 * "Retry verification" / "Check now" run the website's autoVerifyEnterprise
 * server action, which has no API route — the app opens the website's
 * /enterprise/pending page in the in-app browser instead (the app-bridge
 * allowlist has no `enterprise/pending`, so the plain URL is opened and the
 * website prompts for login where it needs to), then re-reads the row.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { PillButton, useHubTheme } from '@/components/enterprise/hub-primitives';
import { AppShell } from '@/components/layout';
import { FontFamily, Radius, Shadows, Spacing } from '@/constants/theme';
import { useRoles, useUser } from '@/lib/auth-context';
import { getOwnEnterpriseProfile } from '@/lib/data/enterprise';
import { VERIFY_POLL_MS } from '@/lib/data/pending';
import { toHref } from '@/lib/enterprise-hub/nav';
import { ROUTES, WEB_BASE } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import type { EnterpriseStatus } from '@/types/database';

interface EnterpriseRow {
  status: EnterpriseStatus;
  rejection_reason: string | null;
}

const WEB_PENDING_URL = `${WEB_BASE}/enterprise/pending`;

export default function EnterprisePendingScreen() {
  const c = useHubTheme();
  const { authedUser, loading: authLoading } = useUser();
  const roles = useRoles();
  const [row, setRow] = useState<EnterpriseRow | null>(null);
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadProfile = useCallback(async (): Promise<EnterpriseRow | null> => {
    const profile = await getOwnEnterpriseProfile();
    return profile ? { status: profile.status, rejection_reason: profile.rejection_reason } : null;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!authedUser) {
      router.replace(toHref(ROUTES.login));
      return;
    }
    let cancelled = false;
    loadProfile()
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          router.replace(toHref(ROUTES.welcome));
          return;
        }
        if (data.status === 'active' || data.status === 'approved') {
          roles.refresh();
          router.replace(toHref(ROUTES.enterprise));
          return;
        }
        setRow(data);
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedUser, authLoading, loadProfile]);

  // Auto-refresh every 5s while verifying.
  useEffect(() => {
    if (!authedUser || !row) return;
    if (row.status !== 'pending_review' || row.rejection_reason) return;
    const id = setInterval(async () => {
      const next = await loadProfile().catch(() => null);
      if (next && (next.status !== row.status || next.rejection_reason)) setRow(next);
      if (next?.status === 'active' || next?.status === 'approved') {
        roles.refresh();
        router.replace(toHref(ROUTES.enterprise));
      }
    }, VERIFY_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedUser, row, loadProfile]);

  async function handleRetry() {
    if (!authedUser || retrying) return;
    setRetrying(true);
    try {
      await WebBrowser.openBrowserAsync(WEB_PENDING_URL);
      const fresh = await loadProfile();
      if (fresh) setRow(fresh);
      roles.refresh();
      if (fresh?.status === 'active' || fresh?.status === 'approved') router.replace(toHref(ROUTES.enterprise));
    } finally {
      setRetrying(false);
    }
  }

  if (authLoading || checking || !row) {
    return (
      <AppShell>
        <View style={styles.centre}>
          <View style={[styles.spinnerRing, { borderColor: c.indigo, borderTopColor: 'transparent' }]} />
        </View>
      </AppShell>
    );
  }

  // ─── Suspended ──────────────────────────────────────────────────
  if (row.status === 'suspended') {
    return (
      <PendingShell title="Account Suspended" tone="warning">
        <Text style={[styles.body, { color: c.textSecondary }]}>
          Your account is currently suspended. Please contact support if you think this is a mistake.
        </Text>
        <PillButton label="Contact support" size="lg" onPress={() => router.push(toHref(ROUTES.help))} style={styles.cta} />
      </PendingShell>
    );
  }

  // ─── Rejected or pending with rejection reason ──────────────────
  if (row.rejection_reason || row.status === 'rejected') {
    return (
      <PendingShell title="We couldn't verify your business" tone="warning">
        <View style={[styles.reason, { borderColor: c.warning + '4D', backgroundColor: c.warning + '0D' }]}>
          <Text style={[styles.reasonEyebrow, { color: c.warning }]}>Reason</Text>
          <Text style={[styles.reasonText, { color: c.textPrimary }]}>
            {row.rejection_reason ?? "Your application wasn't approved."}
          </Text>
        </View>
        <Text style={[styles.bodySm, { color: c.textSecondary }]}>
          Update your company details, then retry. We re-check the ABR and licence registers in real time.
        </Text>
        <View style={styles.actions}>
          <PillButton label="Edit details" size="lg" onPress={() => void openWebOnboarding('enterprise')} fullWidth />
          <PillButton
            label={retrying ? 'Verifying...' : 'Retry verification'}
            variant="outline-indigo"
            size="lg"
            onPress={handleRetry}
            loading={retrying}
            fullWidth
          />
        </View>
      </PendingShell>
    );
  }

  // ─── Verifying ──────────────────────────────────────────────────
  return (
    <PendingShell title="Verifying your business" tone="info">
      <Text style={[styles.body, { color: c.textSecondary }]}>
        We&apos;re checking your ABN with the ABR. This is usually instant — sometimes takes up to a minute.
      </Text>
      <Text style={[styles.bodySm, { color: c.textSecondary + 'B3', marginBottom: Spacing['3xl'] }]}>
        This page will refresh automatically when we&apos;re done. You can leave and come back any time.
      </Text>
      <PillButton
        label={retrying ? 'Checking...' : 'Check now'}
        variant="outline-indigo"
        size="lg"
        onPress={handleRetry}
        loading={retrying}
      />
    </PendingShell>
  );
}

/* ────────────────────────────────────────────────────────────────── */

function PendingShell({ title, tone, children }: { title: string; tone: 'info' | 'warning'; children: ReactNode }) {
  const c = useHubTheme();
  const iconColour = tone === 'warning' ? c.warning : c.indigo;
  return (
    <AppShell>
      <View style={styles.centre}>
        <View style={[styles.card, Shadows.sm, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.iconRing, { backgroundColor: iconColour + '1A' }]}>
            <Ionicons name={tone === 'warning' ? 'alert-circle-outline' : 'time-outline'} size={40} color={iconColour} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            {title}
          </Text>
          {children}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['6xl'],
  },
  spinnerRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  cta: {
    marginTop: Spacing.lg,
  },
  reason: {
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  reasonEyebrow: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reasonText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
});
