/**
 * Enterprise Billing -- subscription plans, current status, and payment history.
 * Reads enterprise_profiles for plan info and shows upgrade options.
 */
import { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { AppShell } from '@/components/layout';
import { useToast } from '@/components/ui';
import { Colors, Radius, Spacing, Shadows, Type } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/auth-context';
import { CAN_SELL_IN_APP } from '@/lib/iap-policy';

type Plan = {
  key: string;
  name: string;
  price: string;
  period: string;
  posts: string;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    key: 'single',
    name: 'Single Post',
    price: '$100',
    period: 'one-off',
    posts: '1 job post',
    features: [
      '1 job listing',
      'Visible for 30 days',
      'Unlimited applications',
      'Direct messaging',
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$250',
    period: '/mo',
    posts: '5 posts per month',
    popular: true,
    features: [
      '5 job listings per month',
      'Priority placement',
      'Analytics dashboard',
      'Direct messaging',
      'Dedicated support',
    ],
  },
  {
    key: 'unlimited',
    name: 'Unlimited',
    price: '$599',
    period: '/mo',
    posts: 'Unlimited posts',
    features: [
      'Unlimited job listings',
      'Featured placement',
      'Advanced analytics',
      'Priority support',
      'Company branding',
      'API access',
    ],
  },
];

export default function EnterpriseBillingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { userId } = useUser();

  const indigo = isDark ? '#818cf8' : '#4f46e5';
  const indigoBg = isDark ? '#1e1b4b' : '#eef2ff';

  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [postsUsed, setPostsUsed] = useState(0);
  const [postsLimit, setPostsLimit] = useState(0);

  const loadBilling = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    const { data: ep } = await supabase
      .from('enterprise_profiles')
      .select('subscription_plan, has_active_subscription, posts_used_this_cycle, posts_limit')
      .eq('user_id', userId)
      .single();

    if (ep) {
      setCurrentPlan(ep.subscription_plan || null);
      setHasSubscription(!!ep.has_active_subscription);
      setPostsUsed(ep.posts_used_this_cycle || 0);
      setPostsLimit(ep.posts_limit || 0);
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { loadBilling(); }, [loadBilling]));

  function handleChoosePlan(plan: Plan) {
    toast.show(`${plan.name} plan selected — payment integration coming soon`, { duration: 4000 });
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        <ActivityIndicator color={indigo} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <AppShell title="Billing & Plans" showBack>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan status */}
        <View style={[styles.statusCard, { backgroundColor: indigoBg, borderColor: isDark ? '#312e81' : '#c7d2fe' }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: isDark ? '#312e81' : '#c7d2fe' }]}>
              <Ionicons name={hasSubscription ? 'shield-checkmark' : 'information-circle'} size={22} color={indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {hasSubscription ? `${currentPlan || 'Active'} Plan` : 'No Active Subscription'}
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                {hasSubscription
                  ? 'Your subscription is currently active'
                  : 'Choose a plan to start posting jobs'}
              </Text>
            </View>
          </View>

          {hasSubscription && postsLimit > 0 && (
            <View style={styles.usageRow}>
              <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Posts this cycle</Text>
              <Text style={[styles.usageValue, { color: indigo }]}>
                {postsUsed} / {postsLimit}
              </Text>
            </View>
          )}
        </View>

        {/* Plan options — hidden on iOS (App Store Guideline 3.1.1: no in-app
            sale of digital subscriptions and no purchase CTAs). */}
        {!CAN_SELL_IN_APP ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={28} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Manage your plan on the web</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Company subscriptions aren&apos;t purchased in the app. Any active plan works here
              automatically and your status is shown above.
            </Text>
          </View>
        ) : (
          <>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose a Plan</Text>

        {PLANS.map(plan => {
          const isActive = currentPlan?.toLowerCase() === plan.key;
          return (
            <View
              key={plan.key}
              style={[
                styles.planCard,
                {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: plan.popular ? indigo : colors.border,
                  borderWidth: plan.popular ? 2 : 1,
                },
              ]}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: indigo }]}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>{plan.price}</Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>{plan.period}</Text>
                </View>
                <Text style={[styles.planPosts, { color: indigo }]}>{plan.posts}</Text>
              </View>

              <View style={[styles.planDivider, { backgroundColor: colors.borderLight }]} />

              <View style={styles.featureList}>
                {plan.features.map(feature => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.planBtn,
                  {
                    backgroundColor: isActive ? colors.border : indigo,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleChoosePlan(plan)}
                disabled={isActive}
              >
                <Text style={[styles.planBtnText, { color: isActive ? colors.textSecondary : '#fff' }]}>
                  {isActive ? 'Current Plan' : 'Choose Plan'}
                </Text>
              </Pressable>
            </View>
          );
        })}
          </>
        )}

        {/* Payment history */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
        <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
          <Ionicons name="receipt-outline" size={28} color={colors.icon} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No payments yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Your invoices and payment history will appear here.
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  scroll: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  sectionTitle: { ...Type.h3, marginTop: Spacing.sm },

  // Status card
  statusCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { ...Type.bodySemiBold },
  statusSubtitle: { ...Type.caption, marginTop: 2 },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  usageLabel: { ...Type.caption },
  usageValue: { ...Type.bodySemiBold },

  // Plan cards
  planCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderBottomLeftRadius: Radius.md,
  },
  popularText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planHeader: { gap: 4 },
  planName: { ...Type.h3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { ...Type.h1 },
  planPeriod: { ...Type.caption },
  planPosts: { ...Type.captionSemiBold, marginTop: 2 },
  planDivider: { height: 1, marginVertical: Spacing.md },
  featureList: { gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { ...Type.body, flex: 1 },
  planBtn: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  planBtnText: { ...Type.btnSecondary },

  // Empty state
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  emptyTitle: { ...Type.bodySemiBold },
  emptyText: { ...Type.caption, textAlign: 'center' },
});
