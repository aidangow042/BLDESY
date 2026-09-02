/**
 * CardStepCard — the read-only native twin of
 * `~/bldesy-web/components/billing/card-setup-card.tsx` (DECISION D3).
 *
 * The app never captures a card: it shows the web card's copy — the $0-today
 * headline, the plan matched to the tradie's trade with the struck price and
 * the plain-English "when does billing start" paragraph — then hands off to
 * the website's /portal/pending, where the Stripe PaymentElement lives.
 */
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { openWebOnboarding } from '@/lib/web-onboarding';
import { CONTACT_THRESHOLD } from '@/lib/web/billing/config';
import { pickTierForTrades, tradieTier } from '@/lib/web/pricing-tiers-client';

export function CardStepCard({
  trades,
  onReturn,
}: {
  /** The tradie's chosen trade categories — resolves their ONE plan. */
  trades: string[];
  /** Called when the in-app browser closes (the row may have changed). */
  onReturn?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  // Price transparency (ACL): the exact plan and price this card will
  // eventually be charged is disclosed HERE, before the card is taken —
  // one recommended plan, resolved from the trades they chose in the wizard.
  const tier = tradieTier(pickTierForTrades(trades));

  async function finishOnWeb() {
    await openWebOnboarding('builder', 'portal/pending');
    onReturn?.();
  }

  return (
    <Card padding={Spacing['2xl']}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: c.primary + '1A' }]}>
          <Ionicons name="card-outline" size={20} color={c.primary} />
        </View>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={[styles.title, { color: c.textPrimary }]}>
            Add a card — $0 today
          </Text>
          <Text style={[styles.free, { color: c.primary }]}>
            Free until {CONTACT_THRESHOLD} homeowners contact you
          </Text>
        </View>
      </View>

      {/* The plan this card will be charged for — full price disclosure
        * BEFORE the card is taken. One plan, matched to their trade. */}
      <View style={[styles.plan, { borderColor: c.primary + '40', backgroundColor: c.primary + '0D' }]}>
        <Text style={[styles.planEyebrow, { color: c.primary }]}>Your plan — matched to your trade</Text>
        <View style={styles.planRow}>
          <View style={styles.planText}>
            <Text style={[styles.planName, { color: c.textPrimary }]}>{tier.name} plan</Text>
            <Text style={[styles.planBestFor, { color: c.textSecondary }]}>{tier.bestFor}</Text>
          </View>
          <View style={styles.planPrice}>
            <Text style={[styles.struck, { color: c.textSecondary }]}>${tier.monthly}/month</Text>
            <Text style={[styles.zero, { color: c.primary }]}>
              $0 <Text style={styles.today}>today</Text>
            </Text>
          </View>
        </View>
        <View style={styles.features}>
          {tier.features.slice(0, 3).map((feature) => (
            <View key={feature} style={styles.feature}>
              <Ionicons name="checkmark" size={14} color={c.primary} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: c.textSecondary }]}>{feature}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.terms, { color: c.textSecondary, borderTopColor: c.primary + '26' }]}>
          <Text style={[styles.termsStrong, { color: c.textPrimary }]}>
            ${tier.monthly}/month starts only after BLDESY has brought you {CONTACT_THRESHOLD} homeowner
            enquiries
          </Text>{' '}
          — then a 14-day grace period runs with full access at $0, and we message you before your
          first charge. Cancel any time before then and you pay nothing. No lock-in, cancel whenever.
        </Text>
      </View>

      <View style={styles.action}>
        <Button variant="primary" size="lg" fullWidth onPress={() => void finishOnWeb()}>
          Finish on the web
        </Button>
      </View>

      <Text style={[styles.footnote, { color: c.textSecondary }]}>
        Card details are held by Stripe — BLDESY never sees or stores them. You&apos;ll get a reminder
        with the exact amount and date before anything is billed.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  free: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  plan: {
    marginTop: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
  },
  planEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  planRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  planText: {
    flex: 1,
    minWidth: 0,
  },
  planName: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  planBestFor: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  struck: {
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'line-through',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  zero: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  today: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  features: {
    marginTop: Spacing.md,
    gap: 6,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  terms: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  termsStrong: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  action: {
    marginTop: Spacing['2xl'],
  },
  footnote: {
    marginTop: Spacing.lg,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
});
