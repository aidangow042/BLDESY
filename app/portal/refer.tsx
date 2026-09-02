/**
 * /portal/refer — port of `~/bldesy-web/app/portal/refer/page.tsx`.
 *
 * Refer & Earn — the permanent nav destination. The summary (code + masked
 * referral rows) is assembled server-side (GET /api/me/referrals), so nothing
 * here ever queries cross-user tables. One screen, no pagination.
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { PortalPage } from '@/components/portal/portal-page';
import { ReferralCodeCard } from '@/components/referrals/referral-code-card';
import { Card, Skeleton } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCents, getMyReferralSummary, type ReferralRowSummary, type ReferralSummary } from '@/lib/data/referrals';
import { WEB_PAGES } from '@/lib/routes';
import { REWARD_CAP_PER_YEAR, REWARD_LABEL } from '@/lib/web/referrals/config';

const EMPTY_SUMMARY: ReferralSummary = {
  code: null,
  shareUrl: null,
  matesJoined: 0,
  verifiedCount: 0,
  earnedCents: 0,
  pendingCents: 0,
  paidCents: 0,
  rows: [],
};

export default function ReferPage() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getMyReferralSummary();
    setSummary(data ?? EMPTY_SUMMARY);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const s = summary ?? EMPTY_SUMMARY;

  return (
    <PortalPage onRefresh={onRefresh} refreshing={refreshing}>
      <View>
        <Text accessibilityRole="header" style={[styles.h1, { color: c.textPrimary }]}>
          Refer &amp; Earn
        </Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          Send your code to a mate — you get {REWARD_LABEL} when they&apos;re verified.
        </Text>
      </View>

      {loading ? (
        <Skeleton variant="card" style={{ height: 220 }} />
      ) : s.code ? (
        <ReferralCodeCard variant="page" initial={s} />
      ) : (
        <Card padding={Spacing['2xl']} style={styles.holdCard}>
          <Text style={[styles.holdTitle, { color: c.textPrimary }]}>Your code unlocks when you&apos;re verified.</Text>
          <Text style={[styles.holdSub, { color: c.textSecondary }]}>Finish verification and it&apos;ll be waiting here.</Text>
        </Card>
      )}

      {/* Totals strip */}
      <View style={styles.totals}>
        <Card padding={Spacing.lg} style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: c.textSecondary }]}>Total earned</Text>
          <Text style={[styles.totalValue, { color: c.textPrimary }]}>{formatCents(s.earnedCents)}</Text>
        </Card>
        <Card padding={Spacing.lg} style={styles.totalCard}>
          <Text style={[styles.totalLabel, { color: c.textSecondary }]}>On the way</Text>
          <Text style={[styles.totalValue, { color: c.primary }]}>{formatCents(s.pendingCents)}</Text>
          <Text style={[styles.totalNote, { color: c.textSecondary }]}>Verified, payout coming</Text>
        </Card>
      </View>

      {/* Referral list */}
      <Card padding={0}>
        <View style={[styles.listHeader, { borderBottomColor: c.border }]}>
          <Text accessibilityRole="header" style={[styles.listTitle, { color: c.textPrimary }]}>
            Your referrals
          </Text>
        </View>
        {s.rows.length === 0 ? (
          <Text style={[styles.listEmpty, { color: c.textSecondary }]}>
            No mates yet — send your code to a tradie who does good work.
          </Text>
        ) : (
          <View>
            {s.rows.map((row, i) => (
              <View key={i} style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
                <View style={styles.listRowText}>
                  <Text numberOfLines={1} style={[styles.rowName, { color: c.textPrimary }]}>
                    {row.name}
                  </Text>
                  <Text style={[styles.rowDate, { color: c.textSecondary }]}>{formatDate(row.date)}</Text>
                </View>
                <StatusChip status={row.status} />
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Plain-English summary; the binding version is /legal/referral-terms. */}
      <Text style={[styles.legal, { color: c.textSecondary + 'CC' }]}>
        How it works: your mate signs up with your code → we verify their credentials → the reward
        becomes payable and lands as a credit on your next invoice. One reward per verified tradie, up
        to {REWARD_CAP_PER_YEAR} a year; self-referrals and duplicate accounts don&apos;t count, and
        rewards may be withheld where we suspect the system is being gamed. Full{' '}
        <Text
          accessibilityRole="link"
          onPress={() => void WebBrowser.openBrowserAsync(WEB_PAGES.referralTerms)}
          style={styles.underline}
        >
          Refer &amp; Earn terms
        </Text>
        .
      </Text>
    </PortalPage>
  );
}

function StatusChip({ status }: { status: ReferralRowSummary['status'] }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (status === 'paid') {
    return (
      <View style={[styles.chip, { backgroundColor: c.successBg }]}>
        <Text style={[styles.chipText, { color: c.success }]}>Paid</Text>
      </View>
    );
  }
  if (status === 'verified') {
    // Verified = payable: the reward is owed and lands with the next payout run.
    return (
      <View style={[styles.chip, { backgroundColor: c.primary + '1A' }]}>
        <Text style={[styles.chipText, { color: c.primary }]}>Verified · payable</Text>
      </View>
    );
  }
  return (
    <View style={[styles.chip, { borderWidth: 1, borderColor: c.border }]}>
      <Text style={[styles.chipText, { color: c.textSecondary }]}>Signed up</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  holdCard: {
    alignItems: 'center',
  },
  holdTitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  holdSub: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FontFamily.body,
  },
  totals: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  totalCard: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  totalValue: {
    marginTop: Spacing.xs,
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  totalNote: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.body,
  },
  listHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  listTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  listEmpty: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.body,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  listRowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  rowDate: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  chip: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FontFamily.body,
  },
  underline: {
    textDecorationLine: 'underline',
  },
});
