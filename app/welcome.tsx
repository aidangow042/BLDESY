/**
 * Welcome / role picker. Mirrors `~/bldesy-web/app/welcome/page.tsx`:
 *   • Small primary-bg eyebrow pill ("One last step")
 *   • Big greeting "Welcome[, {firstName}]!" with `!` tinted primary
 *   • Three vertical cards: I need a tradie / I'm a tradie / I'm a business
 *
 * Routing logic is preserved — already-active builders/enterprises skip this
 * screen entirely (root layout handles that).
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRoles, useUser } from '@/lib/auth-context';

type Role = 'customer' | 'builder' | 'enterprise';

/** "What you'll need" checklist shown before a tradie/enterprise signup so
 *  people arrive prepared (and don't bail when the web form asks for docs). */
const REQUIREMENTS: Record<'builder' | 'enterprise', { intro: string; items: string[] }> = {
  builder: {
    intro: 'Setting up takes about 5 minutes. Have these handy:',
    items: [
      'Your ABN',
      'Trade licence number (if your trade needs one)',
      'White Card (for NSW construction work)',
      'Photo ID — driver\'s licence or passport',
      'Insurance certificate (optional — boosts your profile)',
    ],
  },
  enterprise: {
    intro: 'Have these handy to finish your company listing:',
    items: [
      'Company ABN',
      'Contractor / builder licence (if you do construction work)',
      'Photo ID — driver\'s licence or passport',
      'Insurance certificate (optional)',
    ],
  },
};

interface RoleCard {
  role: Role;
  label: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  footnote: string;
  accent: 'primary' | 'indigo';
  iconGlyph: string;
}

const CARDS: RoleCard[] = [
  {
    role: 'customer',
    label: 'I need a tradie',
    tagline: 'Homeowners & one-off jobs',
    description:
      'Post your project and connect with verified tradies in your area. Free to use, no pressure to commit.',
    features: [
      'Post jobs in minutes — free',
      'Verified tradies only (ABN + licence checked)',
      'Compare quotes side by side',
      'Direct messaging, no middleman',
    ],
    cta: 'Get started',
    footnote: 'Always free for homeowners',
    accent: 'primary',
    iconGlyph: '🏠',
  },
  {
    role: 'builder',
    label: "I'm a tradie",
    tagline: 'Solo operators & small crews',
    description:
      'Build your profile, get verified, and win more work. We match you to jobs that fit your trade and area.',
    features: [
      'ABN + state licence verification',
      'Public profile with portfolio & reviews',
      'Apply to project + home jobs in your area',
      'Skill-based matching with capability badges',
    ],
    cta: 'Join as a tradie',
    footnote: 'Subscription unlocks the dashboard',
    accent: 'primary',
    iconGlyph: '🔧',
  },
  {
    role: 'enterprise',
    label: "I'm a business",
    tagline: 'Builders, developers & property managers',
    description:
      'Post project jobs and contracts. Manage a roster of subcontractors at scale, with tools built for repeat hiring.',
    features: [
      'ABN verification + optional licence checks',
      'Pay per post or subscribe for unlimited',
      'Capability-based applicant scoring',
      'Multi-state contracts + employment terms',
    ],
    cta: 'List your company',
    footnote: 'ABN required — verified instantly',
    accent: 'indigo',
    iconGlyph: '🏗️',
  },
];

export default function WelcomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userId } = useUser();
  const { isBuilder, isEnterprise, loading } = useRoles();
  // Which role's "what you'll need" checklist is open (tradie/enterprise only).
  const [requirements, setRequirements] = useState<'builder' | 'enterprise' | null>(null);

  // If the user already has an active role row, skip welcome.
  useEffect(() => {
    if (loading) return;
    if (isBuilder) router.replace('/(tabs)/portal' as any);
    else if (isEnterprise) router.replace('/enterprise-dashboard' as any);
  }, [isBuilder, isEnterprise, loading, router]);

  if (loading || !userId) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: c.canvas }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  function handlePick(role: Role) {
    if (role === 'customer') {
      router.replace('/(tabs)' as any);
      return;
    }
    // Tradie / enterprise → show the "what you'll need" checklist first.
    setRequirements(role);
  }

  function proceed() {
    const role = requirements;
    setRequirements(null);
    if (role === 'builder') router.push('/builder-signup' as any);
    else if (role === 'enterprise') router.push('/enterprise-signup' as any);
  }

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    (user?.user_metadata?.name as string | undefined)?.split(' ')[0] ||
    '';

  return (
    <View style={[styles.screen, { backgroundColor: c.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing['4xl'],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Badge variant="primary">One last step</Badge>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>
            {firstName ? `Welcome, ${firstName}` : 'Welcome to BLDESY'}
            <Text style={{ color: c.primary }}>!</Text>
          </Text>
          <Text style={[styles.subhead, { color: c.textSecondary }]}>
            Tell us what brings you here. You can add more later from the menu.
          </Text>
        </View>

        {/* Three vertical cards */}
        <View style={styles.cards}>
          {CARDS.map((card) => {
            const accent = card.accent === 'indigo' ? c.indigo : c.primary;
            const accentBg = card.accent === 'indigo' ? c.primaryBg : c.primaryBg;
            return (
              <Card key={card.role} padding={Spacing['2xl']} style={styles.cardItem}>
                {/* Icon + label */}
                <View style={styles.cardHead}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: accentBg },
                    ]}
                  >
                    <Text style={styles.iconGlyph}>{card.iconGlyph}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardLabel, { color: c.textPrimary }]}>{card.label}</Text>
                    <Text style={[styles.cardTagline, { color: c.textSecondary }]}>{card.tagline}</Text>
                  </View>
                </View>

                <Text style={[styles.cardDesc, { color: c.textSecondary }]}>{card.description}</Text>

                <View style={styles.featureList}>
                  {card.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Text style={[styles.bulletDot, { color: accent }]}>•</Text>
                      <Text style={[styles.featureText, { color: c.textPrimary }]}>{f}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  variant={card.accent === 'indigo' ? 'indigo' : 'primary'}
                  size="lg"
                  fullWidth
                  onPress={() => handlePick(card.role)}
                >
                  {card.cta}
                </Button>

                <Text style={[styles.footnote, { color: c.textSecondary }]}>{card.footnote}</Text>
              </Card>
            );
          })}
        </View>

        <Text style={[styles.reassurance, { color: c.textSecondary }]}>
          You can change or add roles anytime from your account menu. All accounts include free messaging and saved tradies.
        </Text>
      </ScrollView>

      {/* "What you'll need" checklist — tradie / enterprise only */}
      <Modal
        visible={!!requirements}
        transparent
        animationType="fade"
        onRequestClose={() => setRequirements(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRequirements(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Before you start</Text>
            <Text style={[styles.modalIntro, { color: c.textSecondary }]}>
              {requirements ? REQUIREMENTS[requirements].intro : ''}
            </Text>
            <View style={styles.modalList}>
              {(requirements ? REQUIREMENTS[requirements].items : []).map((item) => (
                <View key={item} style={styles.modalRow}>
                  <Text style={[styles.modalCheck, { color: requirements === 'enterprise' ? c.indigo : c.primary }]}>✓</Text>
                  <Text style={[styles.modalItem, { color: c.textPrimary }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.modalNote, { color: c.textSecondary }]}>
              {"Don't have everything yet? You can save and come back anytime."}
            </Text>
            <Button
              variant={requirements === 'enterprise' ? 'indigo' : 'primary'}
              size="lg"
              fullWidth
              onPress={proceed}
            >
              {"I'm ready — continue"}
            </Button>
            <Pressable onPress={() => setRequirements(null)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: c.textSecondary }]}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing['3xl'],
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  greeting: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subhead: {
    fontSize: 15,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 480,
  },
  cards: {
    gap: Spacing.lg,
  },
  cardItem: {
    gap: Spacing.lg,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 22,
  },
  cardLabel: {
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  cardTagline: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    marginTop: 1,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulletDot: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: FontFamily.bodyBold,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 22,
    fontFamily: FontFamily.body,
  },
  footnote: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '500',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reassurance: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  modalIntro: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  modalList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  modalCheck: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  modalItem: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FontFamily.body,
  },
  modalNote: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FontFamily.body,
    marginTop: Spacing.xs,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    fontWeight: '600',
  },
});
