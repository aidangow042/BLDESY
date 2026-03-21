import { useState } from 'react';
import {
  Linking,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQ_ITEMS = [
  {
    q: 'How does BLDESY! work?',
    a: "Search for tradies by trade, location, and urgency. View their profiles, check reviews, and contact them directly. No middlemen, no bidding — just a direct connection.",
    icon: 'home-repair-service' as const,
  },
  {
    q: 'Is it free to use as a customer?',
    a: 'Yes — browsing, searching, and contacting tradies is completely free for customers. Builders pay a flat subscription to be listed.',
    icon: 'attach-money' as const,
  },
  {
    q: 'How do I post a job?',
    a: "Tap the + button on the home screen, then 'Post a Job'. Fill in your trade type, location, description, and urgency level. Nearby builders will see your job and can apply.",
    icon: 'post-add' as const,
  },
  {
    q: 'Are builders verified?',
    a: 'All builders go through a manual approval process before being listed. Verified builders display ABN and licence badges on their profiles for extra peace of mind.',
    icon: 'verified' as const,
  },
  {
    q: 'How do I save a tradie?',
    a: 'Tap the heart icon on any builder profile or search result card. All your saved tradies appear in the Saved tab for easy access later.',
    icon: 'favorite-border' as const,
  },
  {
    q: 'How do I become a listed builder?',
    a: 'Open the side menu and tap "Join as Builder". Complete the 3-step signup form with your business details, trade info, and credentials. Our team reviews applications within 1–2 business days.',
    icon: 'engineering' as const,
  },
  {
    q: 'Can I use BLDESY! anywhere in Australia?',
    a: 'Yes! BLDESY! covers all Australian suburbs and postcodes. Search results are sorted by distance from your selected location.',
    icon: 'map' as const,
  },
  {
    q: 'How do I contact support?',
    a: 'You can email us anytime at hello@bldesy.com.au. Our team typically responds within a few hours during business days.',
    icon: 'support-agent' as const,
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Search',
    desc: 'Find tradies by trade type, suburb, and urgency. Use the map or search bar.',
    icon: 'search' as const,
    color: '#0d9488',
  },
  {
    step: '2',
    title: 'Compare',
    desc: 'View profiles, reviews, photos, credentials, and service areas.',
    icon: 'compare-arrows' as const,
    color: '#4f46e5',
  },
  {
    step: '3',
    title: 'Connect',
    desc: 'Call, message, or visit their website directly — no platform fees.',
    icon: 'phone-in-talk' as const,
    color: '#059669',
  },
];

export default function HelpScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={headerStyles.container}>
        <LinearGradient
          colors={isDark ? ['#042f2e', '#0a3a38', '#134E4A'] : ['#064E3B', '#0F6E56', '#1D9E75']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[headerStyles.gradient, { paddingTop: insets.top + Spacing.lg }]}
        >
          <View style={headerStyles.glowWrap} pointerEvents="none">
            <View style={[headerStyles.glow, isDark && { opacity: 0.06 }]} />
          </View>
          <View style={headerStyles.accentLines} pointerEvents="none">
            <View style={[headerStyles.accentLine, { left: '20%', opacity: 0.04 }]} />
            <View style={[headerStyles.accentLine, { left: '50%', opacity: 0.03 }]} />
            <View style={[headerStyles.accentLine, { left: '75%', opacity: 0.025 }]} />
          </View>
          <View style={headerStyles.content}>
            <View style={headerStyles.textCol}>
              <Text style={headerStyles.title}>Help & Support</Text>
              <Text style={headerStyles.subtitle}>Find answers and get in touch</Text>
            </View>
            <View style={headerStyles.iconCircle}>
              <MaterialIcons name="help-outline" size={22} color="#fff" />
            </View>
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(13,148,136,0.12)', 'transparent']}
          style={headerStyles.bottomEdge}
        />
      </View>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color="#ffffff" />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact CTA card */}
        <View
          style={[
            styles.contactCard,
            {
              backgroundColor: isDark ? colors.tealBg : colors.tealBg,
              borderColor: colors.teal + '30',
            },
          ]}
        >
          <View style={[styles.contactIconWrap, { backgroundColor: colors.teal + '18' }]}>
            <MaterialIcons name="support-agent" size={28} color={colors.teal} />
          </View>
          <View style={styles.contactText}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>Need direct help?</Text>
            <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
              Our team typically responds within a few hours during business days.
            </Text>
          </View>
          <View style={styles.contactActions}>
            <Pressable
              style={[styles.contactBtn, { backgroundColor: colors.teal }]}
              onPress={() => Linking.openURL('mailto:hello@bldesy.com.au')}
              accessibilityRole="button"
              accessibilityLabel="Email support"
            >
              <MaterialIcons name="email" size={16} color="#fff" />
              <Text style={styles.contactBtnText}>Email Us</Text>
            </Pressable>
          </View>
        </View>

        {/* How It Works */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          HOW IT WORKS
        </Text>

        <View style={styles.stepsRow}>
          {HOW_IT_WORKS.map((s) => (
            <View
              key={s.step}
              style={[
                styles.stepCard,
                {
                  backgroundColor: isDark ? colors.surface : '#ffffff',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.stepBadge, { backgroundColor: s.color + '15' }]}>
                <Text style={[styles.stepNumber, { color: s.color }]}>{s.step}</Text>
              </View>
              <MaterialIcons name={s.icon} size={24} color={s.color} style={styles.stepIcon} />
              <Text style={[styles.stepTitle, { color: colors.text }]}>{s.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{s.desc}</Text>
            </View>
          ))}
        </View>

        {/* FAQ Accordion */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          FREQUENTLY ASKED QUESTIONS
        </Text>

        <View
          style={[
            styles.faqCard,
            {
              backgroundColor: isDark ? colors.surface : '#ffffff',
              borderColor: colors.border,
            },
          ]}
        >
          {FAQ_ITEMS.map((item, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <Pressable
                key={index}
                onPress={() => toggleFAQ(index)}
                style={[
                  styles.faqItem,
                  {
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: colors.borderLight,
                    backgroundColor: isExpanded
                      ? isDark ? 'rgba(45,212,191,0.04)' : 'rgba(13,148,136,0.02)'
                      : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={styles.faqHeader}>
                  <View
                    style={[
                      styles.faqIconWrap,
                      { backgroundColor: isDark ? colors.border : '#F0FDFA' },
                    ]}
                  >
                    <MaterialIcons name={item.icon} size={16} color={colors.teal} />
                  </View>
                  <Text style={[styles.faqQ, { color: colors.text, flex: 1 }]}>{item.q}</Text>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={colors.icon}
                  />
                </View>
                {isExpanded && (
                  <Text style={[styles.faqA, { color: colors.textSecondary }]}>
                    {item.a}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Quick links */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          QUICK LINKS
        </Text>

        <View
          style={[
            styles.linksCard,
            {
              backgroundColor: isDark ? colors.surface : '#ffffff',
              borderColor: colors.border,
            },
          ]}
        >
          {[
            {
              label: 'Terms of Service',
              icon: 'description' as const,
              onPress: () => router.push('/legal'),
            },
            {
              label: 'Privacy Policy',
              icon: 'privacy-tip' as const,
              onPress: () => router.push('/legal'),
            },
            {
              label: 'Rate BLDESY! on App Store',
              icon: 'star-outline' as const,
              onPress: () => {},
            },
          ].map((link, i) => (
            <Pressable
              key={link.label}
              style={({ pressed }) => [
                styles.linkRow,
                {
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.borderLight,
                  backgroundColor: pressed
                    ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
                    : 'transparent',
                },
              ]}
              onPress={link.onPress}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.linkIconWrap,
                  { backgroundColor: isDark ? colors.border : '#F0FDFA' },
                ]}
              >
                <MaterialIcons name={link.icon} size={16} color={colors.teal} />
              </View>
              <Text style={[styles.linkLabel, { color: colors.text }]}>{link.label}</Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.icon} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
  },

  // Contact CTA
  contactCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  contactText: {
    gap: 4,
  },
  contactTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  contactSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
  },
  contactBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // How it works steps
  stepsRow: {
    gap: Spacing.md,
  },
  stepCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepIcon: {
    marginTop: Spacing.xs,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  // FAQ
  faqCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  faqItem: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  faqIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQ: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 21,
    paddingLeft: 30 + Spacing.md,
  },

  // Quick links
  linksCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 52,
  },
  linkIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});

const headerStyles = StyleSheet.create({
  container: { position: 'relative' },
  gradient: {
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: -40,
    marginRight: -40,
  },
  accentLines: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  accentLine: {
    position: 'absolute',
    top: -20,
    width: 1,
    height: '150%',
    backgroundColor: '#fff',
    transform: [{ rotate: '15deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    zIndex: 1,
  },
  textCol: { flex: 1, gap: 4 },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.75)',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomEdge: { height: 3 },
});
