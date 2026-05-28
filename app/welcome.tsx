/**
 * Welcome / role picker. Mirrors `~/bldesy-web/app/welcome/page.tsx`:
 *   • Small primary-bg eyebrow pill ("One last step")
 *   • Big greeting "Welcome[, {firstName}]!" with `!` tinted primary
 *   • Three vertical cards: I need a tradie / I'm a tradie / I'm a business
 *
 * Routing logic is preserved — already-active builders/enterprises skip this
 * screen entirely (root layout handles that).
 */

import { useEffect } from 'react';
import {
  ActivityIndicator,
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
    if (role === 'customer') router.replace('/(tabs)' as any);
    else if (role === 'builder') router.push('/builder-signup' as any);
    else router.push('/enterprise-signup' as any);
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
});
