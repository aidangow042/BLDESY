/**
 * /welcome — the one-time role picker. Port of the website's
 * app/welcome/page.tsx + app/welcome/welcome-cards.tsx (LIVE branch).
 *
 * Reached right after a fresh signup (root layout routing) and later when an
 * account wants to add a role. Cards:
 *   • I need a tradie  → home (every account can post jobs)
 *   • I'm a tradie     → "what you'll need" checklist → web onboarding hand-off
 *   • I'm a business   → the website's hiring waitlist (the app has no native
 *                        business signup — exactly what the live website does)
 *
 * Filter rules (verbatim from the web): hide the customer card once ANY
 * builder/enterprise application exists; hide builder/enterprise cards only
 * when FULLY ACTIVE. Pending cards stay visible, faded, with "Finish now" and
 * a trash icon that deletes the in-progress application.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormAlert } from '@/components/auth/form-alert';
import { RequirementsModal, type RequirementsRole } from '@/components/auth/requirements-modal';
import { Badge } from '@/components/ui';
import { Colors, FontFamily, Radius, Shadows, Spacing, type ThemeTokens } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api, ApiError } from '@/lib/api';
import { useRoles, useUser, type RoleStatus } from '@/lib/auth-context';
import { useReferralCapture } from '@/lib/auth/referral-code';
import { dispatchProfileChanged } from '@/lib/events/profile';
import { ROUTES } from '@/lib/routes';
import { openWebOnboarding } from '@/lib/web-onboarding';

type RoleKey = 'customer' | 'builder' | 'enterprise';
type CardState = 'none' | 'pending' | 'active';
type Accent = 'primary' | 'indigo' | 'amber';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface RoleCard {
  key: RoleKey;
  label: string;
  /** Short label for the mobile jump-bar chip (e.g. "Tradie"). */
  chip: string;
  tagline: string;
  /** Small muted audience descriptor shown on the coloured strip under the tag. */
  descriptor: string;
  description: string;
  features: string[];
  /** Full-completion CTA label shown when no application is in progress. */
  cta: string;
  footnote: string;
  accent: Accent;
  icon: IoniconName;
}

const ALL_CARDS: RoleCard[] = [
  {
    key: 'customer',
    label: 'I need a tradie',
    chip: 'Homeowner',
    tagline: 'FOR HOMEOWNERS',
    descriptor: 'Homeowners & personal jobs',
    description: 'Find verified, licensed tradies near you. Free to use, no lead fees.',
    features: [
      'Every tradie checked five ways',
      'Free to use, no lead fees',
      'Compare quotes, message direct — no middleman',
    ],
    cta: 'Get started',
    footnote: 'Always free for homeowners',
    accent: 'amber',
    icon: 'home-outline',
  },
  {
    key: 'builder',
    label: "I'm a tradie",
    chip: 'Tradie',
    tagline: 'FOR TRADIES',
    descriptor: 'Anyone doing the work — solo to big crews',
    description:
      'Get verified, build your profile, win more work — residential, commercial and enterprise, one profile.',
    features: [
      'Win more work — jobs in your trade + area, sent to you',
      'Checked five ways — stand out from the randoms',
      'Public profile with portfolio & reviews',
    ],
    cta: 'Onboard now',
    footnote: 'Free until 3 homeowners contact you',
    accent: 'primary',
    icon: 'construct-outline',
  },
  {
    key: 'enterprise',
    label: "I'm a business",
    chip: 'Business',
    tagline: 'FOR BUSINESSES',
    descriptor: 'Anyone hiring trades for a business — builders, property, retail, hospitality',
    description: 'Post jobs, hire verified subbies, and reach signed-up builders direct.',
    features: [
      'Hire subbies checked five ways',
      'Post jobs, reach builders direct — no per-unlock fees',
      'Manage a roster for repeat hiring',
    ],
    cta: 'Join the hiring waitlist',
    footnote: 'First month of Business free — founding offer',
    accent: 'indigo',
    icon: 'business-outline',
  },
];

const DELETE_COPY: Record<'builder' | 'enterprise', string> = {
  builder:
    "This wipes your in-progress tradie application — the form data, your licences, and any capabilities you've ticked. You can start a fresh one anytime.",
  enterprise:
    "This wipes your in-progress company application — the form data, ABN, and any licences you've entered. You can start a fresh one anytime.",
};

// Tailwind stops the web strips end on (`to-emerald-500`, `to-orange-500`).
const EMERALD_500 = '#10b981';
const ORANGE_500 = '#f97316';

function accentColours(accent: Accent, c: ThemeTokens) {
  switch (accent) {
    case 'indigo':
      return { main: c.indigo, dark: c.indigoDark, strip: [c.indigo, c.indigo, c.indigo + 'CC'] as const };
    case 'amber':
      // Homeowner conversion accent — the one place amber is allowed.
      return { main: c.cta, dark: c.ctaDark, strip: [c.cta, c.cta, ORANGE_500] as const };
    default:
      return { main: c.primary, dark: c.primaryDark, strip: [c.primary, c.primary, EMERALD_500] as const };
  }
}

/** Web CardState from the app's RoleStatus ("approved" = passes the portal-access rule). */
function toCardState(status: RoleStatus): CardState {
  if (status === 'approved') return 'active';
  if (status === 'pending') return 'pending';
  return 'none';
}

export default function WelcomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { authedUser, loading: authLoading } = useUser();
  const roles = useRoles();
  useReferralCapture();

  const [busy, setBusy] = useState<RoleKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'builder' | 'enterprise' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<RequirementsRole | null>(null);
  const awaitingBuilder = useRef(false);

  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef<Partial<Record<RoleKey, number>>>({});
  const [jumpBarHeight, setJumpBarHeight] = useState(0);

  const rolesReady = !roles.loading && roles.builderStatus !== null && roles.enterpriseStatus !== null;
  const builderState = toCardState(roles.builderStatus);
  const enterpriseState = toCardState(roles.enterpriseStatus);

  // The cards' states are meaningless without an account.
  useEffect(() => {
    if (!authLoading && !authedUser) router.replace(ROUTES.login);
  }, [authLoading, authedUser]);

  // Both extension rows fully active — nothing left to add or finish.
  useEffect(() => {
    if (rolesReady && builderState === 'active' && enterpriseState === 'active') router.replace(ROUTES.home);
  }, [rolesReady, builderState, enterpriseState]);

  // Back from the tradie hand-off with a builder row → straight to the portal
  // (the same rule the post-auth router applies to any builder row).
  useEffect(() => {
    if (awaitingBuilder.current && rolesReady && roles.isTradie) {
      awaitingBuilder.current = false;
      router.replace(ROUTES.portal);
    }
  }, [rolesReady, roles.isTradie]);

  const cardState = useCallback(
    (key: RoleKey): CardState => {
      if (key === 'builder') return builderState;
      if (key === 'enterprise') return enterpriseState;
      return 'none';
    },
    [builderState, enterpriseState],
  );

  async function handOff(target: RoleKey, run: () => Promise<void>) {
    setBusy(target);
    try {
      await run();
    } finally {
      setBusy(null);
      // They may have progressed on the web while the browser was open.
      roles.refresh();
    }
  }

  function choose(card: RoleCard) {
    const state = cardState(card.key);
    if (card.key === 'customer') {
      setBusy('customer');
      router.replace(ROUTES.home);
      return;
    }
    // Fresh tradie start → the "what you'll need" checklist first. The business
    // card points at the hiring waitlist (no docs needed), so it skips straight
    // through like the customer card.
    if (card.key === 'builder' && state !== 'pending') {
      setRequirements('builder');
      return;
    }
    if (card.key === 'builder') {
      awaitingBuilder.current = true;
      handOff('builder', () => openWebOnboarding('builder', 'portal/pending'));
      return;
    }
    handOff('enterprise', () =>
      state === 'pending'
        ? openWebOnboarding('enterprise', 'enterprise/pending')
        : openWebOnboarding('enterprise-waitlist'),
    );
  }

  function proceedFromRequirements() {
    setRequirements(null);
    awaitingBuilder.current = true;
    handOff('builder', () => openWebOnboarding('builder'));
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/me/application?kind=${confirmDelete}`);
      setConfirmDelete(null);
      dispatchProfileChanged();
      roles.refresh();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Couldn't delete the application.");
    } finally {
      setDeleting(false);
    }
  }

  function scrollToCard(key: RoleKey) {
    const y = cardY.current[key];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - jumpBarHeight - Spacing.sm), animated: true });
  }

  if (authLoading || !authedUser || !rolesReady) {
    return (
      <View style={[styles.loading, { backgroundColor: c.canvas }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const hasAnyRoleStart = builderState !== 'none' || enterpriseState !== 'none';
  const visible = ALL_CARDS.filter((card) => {
    if (card.key === 'customer' && hasAnyRoleStart) return false;
    if (card.key === 'builder' && builderState === 'active') return false;
    if (card.key === 'enterprise' && enterpriseState === 'active') return false;
    return true;
  });
  const isAddingRole = hasAnyRoleStart;
  const showJumpBar = visible.length > 1;

  const firstName =
    (authedUser.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    (authedUser.user_metadata?.name as string | undefined)?.split(' ')[0] ||
    '';

  return (
    <View style={[styles.screen, { backgroundColor: c.canvas }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing['3xl'], paddingBottom: insets.bottom + Spacing['4xl'] },
        ]}
        stickyHeaderIndices={showJumpBar ? [1] : undefined}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Badge variant="primary">{isAddingRole ? 'Pick up where you left off' : 'One last step'}</Badge>
          <Text accessibilityRole="header" style={[styles.greeting, { color: c.textPrimary }]}>
            {firstName ? `Welcome, ${firstName}` : 'Welcome to BLDESY'}
            <Text style={{ color: c.primary }}>!</Text>
          </Text>
          <Text style={[styles.lead, { color: c.textSecondary }]}>
            {isAddingRole
              ? 'Resume an in-progress application or add another role. You can have more than one.'
              : 'Tell us what brings you here. You can add more later from the menu.'}
          </Text>
        </View>

        {/* Sticky jump bar — cards stack vertically, so a tradie/business would
            otherwise scroll past the cards above theirs. */}
        {showJumpBar ? (
          <View
            accessibilityRole="toolbar"
            accessibilityLabel="Jump to a role"
            onLayout={(e: LayoutChangeEvent) => setJumpBarHeight(e.nativeEvent.layout.height)}
            style={[styles.jumpBar, { backgroundColor: c.canvas + 'F2', borderColor: c.border + '99' }]}
          >
            {visible.map((card) => (
              <Pressable
                key={card.key}
                accessibilityRole="button"
                onPress={() => scrollToCard(card.key)}
                style={({ pressed }) => [
                  styles.chip,
                  Shadows.sm,
                  { borderColor: c.border, backgroundColor: pressed ? c.canvas : c.surface },
                ]}
              >
                <View style={[styles.chipDot, { backgroundColor: accentColours(card.accent, c).main }]} />
                <Text style={[styles.chipLabel, { color: c.textPrimary }]}>{card.chip}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {visible.map((card) => {
          const state = cardState(card.key);
          const inProgress = state === 'pending';
          const isBusy = busy === card.key;
          const { main, dark, strip } = accentColours(card.accent, c);

          return (
            <View
              key={card.key}
              onLayout={(e: LayoutChangeEvent) => {
                cardY.current[card.key] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.card,
                Shadows.md,
                { backgroundColor: c.surface, borderColor: c.border },
                inProgress && styles.cardInProgress,
              ]}
            >
              {/* Coloured top strip */}
              <LinearGradient
                colors={strip}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.strip, inProgress && styles.stripInProgress]}
              >
                <View style={styles.stripIcon}>
                  <Ionicons name={card.icon} size={30} color="#ffffff" />
                </View>
                {!inProgress ? (
                  <>
                    <View style={styles.taglinePill}>
                      <Text style={styles.tagline}>{card.tagline}</Text>
                    </View>
                    <Text style={styles.descriptor}>{card.descriptor}</Text>
                  </>
                ) : null}
              </LinearGradient>

              {inProgress ? (
                <>
                  <View style={[styles.inProgress, { backgroundColor: c.warningBg, borderColor: c.warning + '4D' }]}>
                    <View style={[styles.inProgressDot, { backgroundColor: c.warning }]} />
                    <Text style={[styles.inProgressText, { color: c.warning }]}>In progress</Text>
                  </View>
                  {card.key !== 'customer' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${card.label} application`}
                      onPress={() => {
                        setDeleteError(null);
                        setConfirmDelete(card.key as 'builder' | 'enterprise');
                      }}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.trash,
                        Shadows.sm,
                        { backgroundColor: pressed ? c.error : 'rgba(255,255,255,0.9)' },
                      ]}
                    >
                      {({ pressed }) => (
                        <Ionicons name="trash-outline" size={16} color={pressed ? '#ffffff' : c.textSecondary} />
                      )}
                    </Pressable>
                  ) : null}
                </>
              ) : null}

              {/* Body */}
              <View style={styles.body}>
                <Text accessibilityRole="header" style={[styles.cardTitle, { color: c.textPrimary }]}>
                  {card.label}
                </Text>
                <Text style={[styles.cardDescription, { color: c.textSecondary }]}>{card.description}</Text>

                <View style={styles.features}>
                  {card.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <Ionicons name="checkmark" size={16} color={main} style={styles.featureIcon} />
                      <Text style={[styles.featureText, { color: c.textSecondary }]}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.footnote, { color: c.textSecondary }]}>{card.footnote}</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy !== null, busy: isBusy }}
                  disabled={busy !== null}
                  onPress={() => choose(card)}
                  style={({ pressed }) => [styles.cta, (pressed || isBusy) && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={[main, dark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {isBusy ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text style={styles.ctaLabel}>Loading…</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.ctaLabel}>{inProgress ? 'Finish now' : card.cta}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Reassurance footer */}
        <Text style={[styles.reassurance, { color: c.textSecondary }]}>
          You can change or add roles anytime from your account menu. All accounts include free messaging and
          saved tradies.
        </Text>
      </ScrollView>

      {/* Delete confirmation */}
      <Modal
        visible={confirmDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setConfirmDelete(null)}
      >
        <Pressable style={styles.overlay} onPress={() => !deleting && setConfirmDelete(null)}>
          <Pressable
            accessibilityViewIsModal
            onPress={() => {}}
            style={[styles.modalCard, Shadows['2xl'], { backgroundColor: c.surface }]}
          >
            <View style={[styles.modalIcon, { backgroundColor: c.error + '1A' }]}>
              <Ionicons name="trash-outline" size={24} color={c.error} />
            </View>
            <Text accessibilityRole="header" style={[styles.modalTitle, { color: c.textPrimary }]}>
              Confirm deleting application
            </Text>
            <Text style={[styles.modalBody, { color: c.textSecondary }]}>
              {confirmDelete ? DELETE_COPY[confirmDelete] : ''}
            </Text>
            {deleteError ? <FormAlert style={styles.modalAlert}>{deleteError}</FormAlert> : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: deleting, busy: deleting }}
                disabled={deleting}
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.modalPrimary,
                  { backgroundColor: c.error, opacity: pressed || deleting ? 0.9 : 1 },
                  deleting && styles.dimmed,
                ]}
              >
                {deleting ? <ActivityIndicator color="#ffffff" size="small" /> : null}
                <Text style={styles.modalPrimaryLabel}>{deleting ? 'Deleting…' : 'Delete application'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deleting}
                onPress={() => setConfirmDelete(null)}
                style={({ pressed }) => [
                  styles.modalSecondary,
                  { borderColor: c.border, backgroundColor: pressed ? c.canvas : c.surface },
                  deleting && styles.dimmed,
                ]}
              >
                <Text style={[styles.modalSecondaryLabel, { color: c.textPrimary }]}>Keep it</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* "What you'll need" checklist — fresh tradie signup */}
      {requirements ? (
        <RequirementsModal
          role={requirements}
          onClose={() => setRequirements(null)}
          onContinue={proceedFromRequirements}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  greeting: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    maxWidth: 480,
  },
  jumpBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  card: {
    borderRadius: Radius['2xl'],
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardInProgress: {
    opacity: 0.8,
  },
  strip: {
    minHeight: 144,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  stripInProgress: {
    opacity: 0.7,
  },
  stripIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  taglinePill: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tagline: {
    fontSize: 10,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.9)',
  },
  descriptor: {
    marginTop: Spacing.md,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  inProgress: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inProgressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inProgressText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  trash: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 28,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  cardDescription: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  features: {
    marginTop: Spacing.xl,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  footnote: {
    marginTop: Spacing.xl,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
    opacity: 0.7,
  },
  cta: {
    marginTop: Spacing.xl,
    height: 48,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  ctaLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  reassurance: {
    marginTop: Spacing.xl,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 448,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  modalBody: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  modalAlert: {
    marginTop: Spacing.lg,
  },
  modalActions: {
    marginTop: Spacing['2xl'],
    gap: Spacing.md,
  },
  modalPrimary: {
    height: 44,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  modalPrimaryLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  modalSecondary: {
    height: 44,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalSecondaryLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  dimmed: {
    opacity: 0.5,
  },
});
