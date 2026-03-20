import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FAQ_ITEMS = [
  {
    q: 'How does BLDESY! work?',
    a: "Search for tradies by trade, location, and urgency. View their profiles, check reviews, and contact them directly. No middlemen, no bidding.",
  },
  {
    q: 'Is it free to use as a customer?',
    a: 'Yes — browsing and contacting tradies is completely free for customers.',
  },
  {
    q: 'How do I post a job?',
    a: "Tap the Post a Job button on the home screen. Fill in your trade type, location, description, and urgency. Builders will see and can apply.",
  },
  {
    q: 'Are builders verified?',
    a: 'All builders go through a manual approval process. Verified builders display ABN and licence badges on their profiles.',
  },
  {
    q: 'How do I save a tradie?',
    a: 'Tap the heart icon on any builder profile. Saved tradies appear in your Saved tab.',
  },
  {
    q: 'How do I become a listed builder?',
    a: 'Tap "Join as Builder" in the menu. Complete the 3-step signup form. Our team reviews your application within 1–2 business days.',
  },
];

export default function HelpScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.canvas }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact CTA */}
        <View
          style={[
            styles.contactCard,
            { backgroundColor: colors.tealBg, borderColor: colors.teal + '30' },
          ]}
        >
          <MaterialIcons name="support-agent" size={32} color={colors.teal} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactTitle, { color: colors.text }]}>Need direct help?</Text>
            <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
              Our team typically responds within a few hours.
            </Text>
          </View>
          <Pressable
            style={[styles.contactBtn, { backgroundColor: colors.teal }]}
            onPress={() => Linking.openURL('mailto:hello@bldesy.com.au')}
            accessibilityRole="button"
            accessibilityLabel="Email support"
          >
            <Text style={styles.contactBtnText}>Email us</Text>
          </Pressable>
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          FREQUENTLY ASKED
        </Text>

        <View
          style={[
            styles.faqCard,
            { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border },
          ]}
        >
          {FAQ_ITEMS.map((item, index) => (
            <View
              key={index}
              style={[
                styles.faqItem,
                {
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.faqQ, { color: colors.text }]}>{item.q}</Text>
              <Text style={[styles.faqA, { color: colors.textSecondary }]}>{item.a}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          HOW IT WORKS
        </Text>

        {[
          { step: '1', title: 'Search', desc: 'Find tradies by trade type, suburb, and urgency.', icon: 'search' },
          { step: '2', title: 'Compare', desc: 'View profiles, reviews, photos, and credentials.', icon: 'compare' },
          { step: '3', title: 'Connect', desc: 'Call or message directly — no platform fees.', icon: 'phone' },
        ].map((s) => (
          <View
            key={s.step}
            style={[
              styles.stepCard,
              { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border },
            ]}
          >
            <View style={[styles.stepNumber, { backgroundColor: colors.teal }]}>
              <Text style={styles.stepNumText}>{s.step}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{s.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.lg,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  contactSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  contactBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  contactBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
  faqCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  faqItem: {
    padding: Spacing.lg,
    gap: 6,
  },
  faqQ: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 21,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },
});
