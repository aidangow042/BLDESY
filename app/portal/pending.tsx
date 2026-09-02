/**
 * /portal/pending — port of `~/bldesy-web/app/portal/pending/page.tsx`.
 *
 * Pending-state landing page for tradies, driven by lib/data/pending's
 * derivePendingAction():
 *   verifying   pending_review, no reason → auto-refreshing shell
 *   rejected    reason + retry/edit (web hand-off — the retry is a website
 *               server action with no API route)
 *   flagged     passed verification, held for a final human review
 *   declined    quietly declined after a quality flag
 *   suspended   contact support
 *   activate    anonymous account → verify contact on the web
 *   card_step   value-gated free, no card, flag ON → read-only card copy +
 *               "Finish on the web" (DECISION D3 — no native card capture)
 *   plan_picker legacy NULL plan_state → web hand-off
 *   portal      nothing to do here → /portal
 *
 * Renders WITHOUT the portal chrome (the shell skips it for this route).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CardStepCard } from '@/components/billing/card-step-card';
import { PendingShell, pendingStyles } from '@/components/portal/pending-shell';
import { ScoreRevealCard } from '@/components/portal/score-reveal-card';
import { ReferralCodeCard } from '@/components/referrals/referral-code-card';
import { Button, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@/lib/auth-context';
import { fetchCardStepEnabled } from '@/lib/data/billing';
import {
  derivePendingAction,
  getPendingRow,
  pendingTradesFor,
  shouldPollVerification,
  verificationProgressed,
  VERIFY_POLL_MS,
  type PendingBuilderRow,
} from '@/lib/data/pending';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';
import { ROUTES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { pickTierForTrades, tradieTier } from '@/lib/web/pricing-tiers-client';

export default function PortalPendingPage() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { user, loading: authLoading } = useUser();

  const [row, setRow] = useState<PendingBuilderRow | null>(null);
  const [checking, setChecking] = useState(true);
  const [rechecking, setRechecking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Value-gated billing: is the card step live? (app_flags is service-role-
  // only, so the flag comes via the card-setup route.) null = still loading.
  const [cardStepEnabled, setCardStepEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchCardStepEnabled().then((enabled) => {
      if (!cancelled) setCardStepEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadProfile = useCallback(async (userId: string) => getPendingRow(userId), []);

  const reload = useCallback(async () => {
    if (!user) return;
    setRechecking(true);
    try {
      const next = await loadProfile(user.id);
      if (next) setRow(next);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setRechecking(false);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(ROUTES.login);
      return;
    }
    let cancelled = false;
    loadProfile(user.id)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          // No builder profile yet — the shell shows its "No tradie profile"
          // card; nothing to render here.
          setRow(null);
          setChecking(false);
          return;
        }
        if (data.status === 'active') {
          router.replace(ROUTES.portal);
          return;
        }
        setRow(data);
        setChecking(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Verification failed.');
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router, loadProfile]);

  const userFacts = user
    ? { is_anonymous: user.is_anonymous, email: user.email, phone: user.phone }
    : null;
  const action = row ? derivePendingAction(row, userFacts, cardStepEnabled) : null;

  // Approved tradie with nothing to do on this page → the portal is home.
  useEffect(() => {
    if (action === 'portal') router.replace(ROUTES.portal);
  }, [action, router]);

  // Auto-refresh every 5 seconds while we're verifying so the UI moves on
  // as soon as the per-licence verifications finish in the background.
  useEffect(() => {
    if (!user || !row) return;
    if (!shouldPollVerification(row)) return;
    const id = setInterval(async () => {
      const next = await loadProfile(user.id).catch(() => null);
      if (verificationProgressed(row, next)) setRow(next);
      if (next?.status === 'active') router.replace(ROUTES.portal);
    }, VERIFY_POLL_MS);
    return () => clearInterval(id);
  }, [user, row, loadProfile, router]);

  if (authLoading || checking || !row || !user) {
    return (
      <View style={[styles.centre, { backgroundColor: c.canvas }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  // ─── Suspended ──────────────────────────────────────────────────
  if (action === 'suspended') {
    return (
      <PendingShell title="Account Suspended" tone="warning">
        <Text style={[pendingStyles.body, { color: c.textSecondary }]}>
          Your account is currently suspended. Please contact support if you think this is a mistake.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.help)}
          style={[pendingStyles.primaryPill, { backgroundColor: c.primary }]}
        >
          <Text style={[pendingStyles.pillText, { color: '#ffffff' }]}>Contact support</Text>
        </Pressable>
      </PendingShell>
    );
  }

  // ─── Approved: activation / card step / (legacy) plan picker / portal ──
  if (action === 'activate' || action === 'card_step' || action === 'await_flag' || action === 'plan_picker' || action === 'portal') {
    const needsActivation = action === 'activate';
    const showCardStep = action === 'card_step';
    const isLegacy = action === 'plan_picker';
    const trades = pendingTradesFor(row);
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.canvas }]}>
        <ScrollView contentContainerStyle={styles.approvedScroll}>
          {/* Tight hero — one line of headline. */}
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: c.primary }]}>
              <Ionicons name="checkmark" size={24} color="#ffffff" />
            </View>
            <Text accessibilityRole="header" style={[styles.heroTitle, { color: c.textPrimary }]}>
              You&apos;re approved.{' '}
              <Text style={{ color: c.primary }}>
                {needsActivation
                  ? 'Confirm your contact to go live.'
                  : showCardStep
                    ? 'Add a card to go live — $0 today.'
                    : isLegacy
                      ? 'Pick your plan to go live.'
                      : 'Taking you to your portal…'}
              </Text>
            </Text>
          </View>

          {/* Score reveal — the tradie's own trust score + how to raise it. */}
          {row.bldesy_score != null ? (
            <View style={styles.section}>
              <ScoreRevealCard score={row.bldesy_score} breakdown={row.bldesy_score_breakdown} />
            </View>
          ) : null}

          <View style={styles.sectionLg}>
            {needsActivation ? (
              <HandOffCard
                title="Verify your details to activate your account"
                body="You skipped sign-up to get here faster — now that you're approved, one quick verification makes this account yours and unlocks your plan."
                footnote="This becomes your login — you can add the other one later in Settings."
                onReturn={reload}
              />
            ) : showCardStep ? (
              <CardStepCard trades={trades} onReturn={reload} />
            ) : isLegacy ? (
              <LegacyPlanCard trades={trades} onReturn={reload} />
            ) : (
              <View style={styles.spinnerBlock}>
                <ActivityIndicator size="large" color={c.primary} />
              </View>
            )}
          </View>

          {/* Credentials proof strip */}
          <View style={styles.ticks}>
            <CredentialTick label="ABN verified" />
            <CredentialTick label="Licence verified" />
            <CredentialTick label="ID verified" />
            <CredentialTick label="White Card verified" />
          </View>

          {/* What happens next */}
          <View style={styles.sectionLg}>
            <Text style={[styles.nextEyebrow, { color: c.primary }]}>
              {showCardStep ? "What happens once your card's on file" : 'What happens after you subscribe'}
            </Text>
            <View style={styles.nextGrid}>
              <NextStepCard
                step={1}
                title="Profile goes live"
                body="Your verified badge, licence, and trade categories appear in search across all suburbs you cover."
              />
              <NextStepCard
                step={2}
                title="Start applying"
                body="Browse open jobs from homeowners and construction companies. Unlimited applications, no per-lead fees."
              />
              <NextStepCard
                step={3}
                title="Get hired"
                body="Message clients directly, share your portfolio, and turn applications into paid work."
              />
            </View>
          </View>

          {/* Trust footer */}
          <View style={[styles.trust, { borderColor: c.border, backgroundColor: c.surface + '99' }]}>
            <Text style={[styles.trustText, { color: c.textSecondary }]}>
              <Text style={[styles.trustStrong, { color: c.textPrimary }]}>Cancel or change plans anytime.</Text>{' '}
              Secured by Stripe. No setup fees, no minimum term, no per-lead charges — ever.
            </Text>
          </View>

          {/* Referral card — hidden until the account is activated. */}
          {!needsActivation ? (
            <View style={styles.section}>
              <ReferralCodeCard variant="onboarding" />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Quietly declined by a human after a quality flag ───────────
  if (action === 'declined') {
    return (
      <PendingShell title="Application update" tone="warning">
        <Text style={[pendingStyles.body, { color: c.textSecondary }]}>
          Thanks for your interest in BLDESY. We&apos;re not able to approve your application at this time.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(ROUTES.help)}
          style={[pendingStyles.primaryPill, { backgroundColor: c.primary }]}
        >
          <Text style={[pendingStyles.pillText, { color: '#ffffff' }]}>Contact support</Text>
        </Pressable>
      </PendingShell>
    );
  }

  // ─── Rejected or pending with rejection reason ──────────────────
  if (action === 'rejected') {
    return (
      <PendingShell title="We couldn't verify yet" tone="warning">
        <View style={[styles.reasonBox, { borderColor: c.warning + '4D', backgroundColor: c.warning + '0D' }]}>
          <Text style={[styles.reasonEyebrow, { color: c.warning }]}>Reason</Text>
          <Text style={[styles.reasonText, { color: c.textPrimary }]}>
            {row.rejection_reason ?? "Your application wasn't approved."}
          </Text>
        </View>
        <Text style={[pendingStyles.bodySm, { color: c.textSecondary, marginBottom: Spacing['2xl'] }]}>
          Update your details, then retry. We re-check NSW Fair Trading and the QBCC register in real time.
        </Text>
        {loadError ? (
          <View style={[pendingStyles.errorBox, { borderColor: c.error + '4D', backgroundColor: c.error + '0D' }]}>
            <Text style={[pendingStyles.errorText, { color: c.error }]}>{loadError}</Text>
          </View>
        ) : null}
        <View style={styles.actionsCol}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openWebOnboarding('builder').then(reload)}
            style={[pendingStyles.primaryPill, { backgroundColor: c.primary }]}
          >
            <Text style={[pendingStyles.pillText, { color: '#ffffff' }]}>Edit details</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={rechecking}
            onPress={() => void openWebOnboarding('builder', 'portal/pending').then(reload)}
            style={[pendingStyles.outlinePill, { borderColor: c.primary }, rechecking && pendingStyles.disabled]}
          >
            {rechecking ? <ActivityIndicator size="small" color={c.primary} /> : null}
            <Text style={[pendingStyles.pillText, { color: c.primary }]}>
              {rechecking ? 'Verifying...' : 'Retry verification'}
            </Text>
          </Pressable>
        </View>
      </PendingShell>
    );
  }

  // ─── Held for a final manual review (flagged by the quality check) ──
  if (action === 'flagged') {
    return (
      <PendingShell title="Reviewing your details" tone="info">
        <Text style={[pendingStyles.bodySm, { color: c.textSecondary, fontSize: 16, lineHeight: 24 }]}>
          Thanks — your verification checks have passed and your profile is with our team for a final review.
        </Text>
        <Text style={[pendingStyles.bodySm, { color: c.textSecondary + 'B3' }]}>
          This usually takes a few hours and can take up to one business day. We&apos;ll let you know the
          moment you&apos;re live — you don&apos;t need to do anything.
        </Text>
      </PendingShell>
    );
  }

  // ─── Verifying (pending_review, no rejection reason) ────────────
  return (
    <PendingShell title="Verifying your details" tone="info">
      <Text style={[pendingStyles.bodySm, { color: c.textSecondary, fontSize: 16, lineHeight: 24 }]}>
        We&apos;re checking your ABN with the ABR and your licences with NSW Fair Trading / QBCC. This is
        usually instant — sometimes takes up to a minute.
      </Text>
      <Text style={[pendingStyles.bodySm, { color: c.textSecondary + 'B3', marginBottom: Spacing['3xl'] }]}>
        This page will refresh automatically when we&apos;re done. You can leave and come back any time.
      </Text>
      {loadError ? (
        <View style={[pendingStyles.errorBox, { borderColor: c.error + '4D', backgroundColor: c.error + '0D' }]}>
          <Text style={[pendingStyles.errorText, { color: c.error }]}>{loadError}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={rechecking}
        onPress={() => void reload()}
        style={[pendingStyles.outlinePill, { borderColor: c.primary }, rechecking && pendingStyles.disabled]}
      >
        {rechecking ? <ActivityIndicator size="small" color={c.primary} /> : null}
        <Text style={[pendingStyles.pillText, { color: c.primary }]}>{rechecking ? 'Checking...' : 'Check now'}</Text>
      </Pressable>
    </PendingShell>
  );
}

/* ── Approved-state helper bits ─────────────────────────────────── */

function HandOffCard({
  title,
  body,
  footnote,
  onReturn,
}: {
  title: string;
  body: string;
  footnote?: string;
  onReturn: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing['2xl']}>
      <Text accessibilityRole="header" style={[styles.handOffTitle, { color: c.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.handOffBody, { color: c.textSecondary }]}>{body}</Text>
      <View style={styles.handOffAction}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => void openWebOnboarding('builder', 'portal/pending').then(onReturn)}
        >
          Finish on the web
        </Button>
      </View>
      {footnote ? <Text style={[styles.handOffFootnote, { color: c.textSecondary }]}>{footnote}</Text> : null}
    </Card>
  );
}

/**
 * Legacy NULL plan_state rows (pre value-gated billing) still pick a plan —
 * the PlanPicker's Stripe Checkout lives on the website. iOS sells nothing,
 * so the hand-off button only renders where the app may link to a purchase.
 */
function LegacyPlanCard({ trades, onReturn }: { trades: string[]; onReturn: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const tier = tradieTier(pickTierForTrades(trades));
  return (
    <Card padding={Spacing['2xl']}>
      <Text style={[styles.legacyEyebrow, { color: c.primary }]}>Recommended for your trades · change anytime</Text>
      <Text accessibilityRole="header" style={[styles.handOffTitle, { color: c.textPrimary, textAlign: 'left' }]}>
        {tier.name}
      </Text>
      <Text style={[styles.legacyTagline, { color: c.primary }]}>{tier.tagline}</Text>
      <Text style={[styles.handOffBody, { color: c.textSecondary, textAlign: 'left' }]}>{tier.bestFor}</Text>
      {CAN_SELL_IN_APP ? (
        <View style={styles.handOffAction}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => void openWebOnboarding('builder', 'portal/pending').then(onReturn)}
          >
            Finish on the web
          </Button>
        </View>
      ) : (
        <Text style={[styles.handOffFootnote, { color: c.textSecondary, textAlign: 'left' }]}>
          Pick your plan on the web at bldesy.com.au
        </Text>
      )}
    </Card>
  );
}

function CredentialTick({ label }: { label: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View style={styles.tick}>
      <View style={[styles.tickIcon, { backgroundColor: c.success + '26' }]}>
        <Ionicons name="checkmark" size={10} color={c.success} />
      </View>
      <Text style={[styles.tickText, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );
}

function NextStepCard({ step, title, body }: { step: number; title: string; body: string }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Card padding={Spacing.xl}>
      <View style={styles.nextHeader}>
        <View style={[styles.nextStep, { backgroundColor: c.primary + '1A' }]}>
          <Text style={[styles.nextStepText, { color: c.primary }]}>{step}</Text>
        </View>
        <Text style={[styles.nextTitle, { color: c.textPrimary }]}>{title}</Text>
      </View>
      <Text style={[styles.nextBody, { color: c.textSecondary }]}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['3xl'],
  },
  hero: {
    alignItems: 'center',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: Spacing.xl,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  section: {
    marginTop: Spacing['3xl'],
  },
  sectionLg: {
    marginTop: Spacing['4xl'],
  },
  spinnerBlock: {
    paddingVertical: Spacing['4xl'],
    alignItems: 'center',
  },
  ticks: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing.xl,
    rowGap: Spacing.sm,
  },
  tick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tickIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  nextEyebrow: {
    marginBottom: Spacing.lg,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  nextGrid: {
    gap: Spacing.md,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  nextStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  nextTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  nextBody: {
    marginTop: Spacing.md,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  trust: {
    marginTop: Spacing['3xl'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  trustText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  trustStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  handOffTitle: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  handOffBody: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  handOffAction: {
    marginTop: Spacing.xl,
  },
  handOffFootnote: {
    marginTop: Spacing.xl,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  legacyEyebrow: {
    marginBottom: Spacing.md,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  legacyTagline: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  reasonBox: {
    alignSelf: 'stretch',
    marginBottom: Spacing['2xl'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reasonEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  reasonText: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  actionsCol: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
});
