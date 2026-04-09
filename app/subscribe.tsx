/**
 * Subscription plan selection for builders — BLDESY Pro.
 * Matches the website's /portal/subscribe page.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  'Public profile with projects, team & reviews',
  'Appear in search results & interactive map',
  'Unlimited job applications',
  'Verified badge (ABN, licence & insurance)',
  'Full analytics dashboard & performance insights',
  'AI-powered job matching & assistant',
  'Portfolio showcase with before/after photos',
  'Customer enquiries via Request a Quote',
];

const PLANS = [
  {
    key: 'monthly',
    name: 'BLDESY Pro',
    price: '$49',
    period: '/month',
    description: 'Full access, billed monthly',
    savings: null,
    popular: false,
  },
  {
    key: 'annual',
    name: 'BLDESY Pro',
    price: '$468',
    period: '/year',
    description: 'Full access, billed annually',
    savings: 'Save $120/year',
    popular: true,
  },
];

export default function SubscribeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const teal = colors.teal;
  const tealBg = colors.tealBg;

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSubscribe(plan: string) {
    setLoadingPlan(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Please log in to subscribe.');
        setLoadingPlan(null);
        return;
      }

      // Call Stripe checkout API
      const res = await supabase.functions.invoke('stripe-checkout', {
        body: { plan },
      });

      if (res.error) {
        Alert.alert('Error', 'Subscription setup is not yet configured. Contact support.');
      } else if (res.data?.url) {
        // Open Stripe checkout in browser
        const { Linking } = require('react-native');
        Linking.openURL(res.data.url);
      } else {
        Alert.alert('Info', 'Subscription management will be available soon. Your profile is active while in beta.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    }
    setLoadingPlan(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#134E4A', '#0D3B3B'] : ['#0D7C66', '#0A6B58']}
          style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>BLDESY Pro</Text>
          <Text style={styles.headerSubtitle}>
            Get found by local customers and grow your trade business
          </Text>
        </LinearGradient>

        {/* Plans */}
        <View style={styles.plans}>
          {PLANS.map((plan) => (
            <View
              key={plan.key}
              style={[
                styles.planCard,
                {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: plan.popular ? teal : colors.border,
                  borderWidth: plan.popular ? 2 : 1,
                },
                Shadows.md,
              ]}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: teal }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.text }]}>{plan.price}</Text>
                <Text style={[styles.period, { color: colors.textSecondary }]}>{plan.period}</Text>
              </View>
              <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{plan.description}</Text>

              {plan.savings && (
                <View style={[styles.savingsBadge, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="pricetag" size={14} color={colors.success} />
                  <Text style={[styles.savingsText, { color: colors.success }]}>{plan.savings}</Text>
                </View>
              )}

              <Pressable
                style={[styles.subscribeBtn, { backgroundColor: teal, opacity: loadingPlan === plan.key ? 0.7 : 1 }]}
                onPress={() => handleSubscribe(plan.key)}
                disabled={!!loadingPlan}
              >
                {loadingPlan === plan.key ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.subscribeBtnText}>Subscribe</Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Everything included</Text>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={teal} />
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Trust note */}
        <View style={[styles.trustCard, { backgroundColor: tealBg }]}>
          <Ionicons name="shield-checkmark" size={24} color={teal} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: colors.text }]}>Cancel anytime</Text>
            <Text style={[styles.trustDesc, { color: colors.textSecondary }]}>
              No lock-in contracts. Cancel your subscription at any time from the billing page.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], gap: Spacing.sm },
  backBtn: { marginBottom: Spacing.sm },
  headerTitle: { color: '#fff', ...Type.display, textAlign: 'center' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', ...Type.body, textAlign: 'center' },
  plans: { gap: Spacing.lg, paddingHorizontal: Spacing.xl, marginTop: -Spacing.xl },
  planCard: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.sm, overflow: 'hidden' },
  popularBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: Spacing.md, paddingVertical: 4, borderBottomLeftRadius: Radius.md },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  planName: { ...Type.h3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  period: { ...Type.body },
  planDesc: { ...Type.caption },
  savingsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm },
  savingsText: { ...Type.captionSemiBold },
  subscribeBtn: { height: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  subscribeBtnText: { color: '#fff', ...Type.btnPrimary },
  featuresSection: { paddingHorizontal: Spacing.xl, marginTop: Spacing['2xl'], gap: Spacing.md },
  featuresTitle: { ...Type.h2, marginBottom: Spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { ...Type.body, flex: 1 },
  trustCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginTop: Spacing['2xl'], padding: Spacing.lg, borderRadius: Radius.lg },
  trustTitle: { ...Type.bodySemiBold },
  trustDesc: { ...Type.caption },
});
