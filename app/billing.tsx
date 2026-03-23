import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/* ── Mock data (replace with Supabase / Stripe queries later) ── */

const SUBSCRIPTION = {
  plan: 'Pro',
  price: '$49',
  interval: 'month',
  status: 'active' as const,
  renewalDate: '15 April 2026',
  startedDate: '15 March 2026',
};

const PAYMENT_METHOD = {
  brand: 'Visa',
  last4: '4242',
  expiry: '09/28',
};

const INVOICE_HISTORY = [
  { id: 'inv_1', date: '15 Mar 2026', amount: '$49.00', status: 'Paid' },
  { id: 'inv_2', date: '15 Feb 2026', amount: '$49.00', status: 'Paid' },
  { id: 'inv_3', date: '15 Jan 2026', amount: '$49.00', status: 'Paid' },
];

/* ── Helpers ── */

function maskCard(brand: string, last4: string) {
  return `${brand} •••• •••• •••• ${last4}`;
}

function brandIcon(brand: string): React.ComponentProps<typeof Ionicons>['name'] {
  switch (brand.toLowerCase()) {
    case 'visa': return 'card-outline';
    case 'mastercard': return 'card-outline';
    default: return 'card-outline';
  }
}

/* ── Screen ── */

export default function BillingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const teal = colors.teal;

  function handleManageSubscription() {
    Alert.alert(
      'Manage Subscription',
      'This will open the Stripe customer portal where you can change or cancel your plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {} },
      ],
    );
  }

  function handleUpdatePayment() {
    Alert.alert(
      'Update Payment Method',
      'This will open a secure form to update your card details.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {} },
      ],
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#042f2e', '#0a3a38', '#134E4A'] : ['#064E3B', '#0F6E56', '#1D9E75']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Billing</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Subscription Card ── */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tealBg }]}>
              <Ionicons name="diamond" size={20} color={teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {SUBSCRIPTION.plan} Plan
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {SUBSCRIPTION.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.tealBg }]}>
              <Text style={[styles.statusText, { color: teal }]}>Active</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {SUBSCRIPTION.price}/{SUBSCRIPTION.interval}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next billing date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {SUBSCRIPTION.renewalDate}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Member since</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {SUBSCRIPTION.startedDate}
            </Text>
          </View>

          <Pressable
            onPress={handleManageSubscription}
            style={({ pressed }) => [
              styles.manageBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="settings" size={16} color={colors.textSecondary} />
            <Text style={[styles.manageBtnText, { color: colors.text }]}>Manage Subscription</Text>
          </Pressable>
        </View>

        {/* ── Payment Method ── */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tealBg }]}>
              <Ionicons name={brandIcon(PAYMENT_METHOD.brand)} size={20} color={teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Payment Method</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.paymentRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: colors.border }]}>
            <View style={styles.paymentInfo}>
              <Ionicons name="card" size={24} color={teal} />
              <View>
                <Text style={[styles.paymentCard, { color: colors.text }]}>
                  {maskCard(PAYMENT_METHOD.brand, PAYMENT_METHOD.last4)}
                </Text>
                <Text style={[styles.paymentExpiry, { color: colors.textSecondary }]}>
                  Expires {PAYMENT_METHOD.expiry}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleUpdatePayment}
            style={({ pressed }) => [
              styles.manageBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="credit-card" size={16} color={colors.textSecondary} />
            <Text style={[styles.manageBtnText, { color: colors.text }]}>Update Payment Method</Text>
          </Pressable>
        </View>

        {/* ── Invoice History ── */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#fff', borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tealBg }]}>
              <Ionicons name="receipt-outline" size={20} color={teal} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Invoice History</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {INVOICE_HISTORY.map((inv, index) => (
            <View key={inv.id}>
              <View style={styles.invoiceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.invoiceDate, { color: colors.text }]}>{inv.date}</Text>
                  <Text style={[styles.invoiceAmount, { color: colors.textSecondary }]}>{inv.amount}</Text>
                </View>
                <View style={[styles.invoiceBadge, { backgroundColor: colors.tealBg }]}>
                  <Text style={[styles.invoiceBadgeText, { color: teal }]}>{inv.status}</Text>
                </View>
              </View>
              {index < INVOICE_HISTORY.length - 1 && (
                <View style={[styles.invoiceDivider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  // Card
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Manage button
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  manageBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Payment method
  paymentRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentCard: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  paymentExpiry: {
    fontSize: 12,
    marginTop: 2,
  },

  // Invoices
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  invoiceDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  invoiceAmount: {
    fontSize: 13,
    marginTop: 1,
  },
  invoiceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  invoiceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDivider: {
    height: 1,
  },
});
