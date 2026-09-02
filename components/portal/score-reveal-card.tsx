/**
 * ScoreRevealCard — port of `~/bldesy-web/components/portal/score-reveal-card.tsx`.
 *
 * The approval-moment score reveal: "this is your BLDESY Score" plus the
 * concrete ways to raise it, derived from the persisted score breakdown.
 * This is the tradie's OWN view of their score — unrelated to the public
 * display_bldesy_score opt-in, which only controls what customers see.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { improvementTips } from '@/lib/data/pending';
import type { BldesyScoreBreakdown } from '@/types/database';

export function ScoreRevealCard({
  score,
  breakdown,
}: {
  score: number;
  breakdown: BldesyScoreBreakdown | null;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const tips = breakdown ? improvementTips(breakdown) : [];
  const pct = Math.max(0, Math.min(100, score));

  return (
    <Card padding={Spacing.xl} flat>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: c.primary }]}>Your BLDESY Score</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            Your trust score out of 100 — built from your verified credentials and reputation. It
            grows with your profile.
          </Text>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: c.primary }]}>{score}</Text>
          <Text style={[styles.outOf, { color: c.textSecondary }]}>/100</Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: c.border + '99' }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c.primary }]} />
      </View>

      {tips.length > 0 ? (
        <View style={styles.tips}>
          <Text style={[styles.tipsTitle, { color: c.textPrimary }]}>Ways to get it higher</Text>
          <View style={styles.tipList}>
            {tips.map((tip) => (
              <View key={tip.key} style={styles.tip}>
                <Ionicons name="arrow-up-outline" size={14} color={c.primary} style={styles.tipIcon} />
                {tip.href ? (
                  <Text
                    accessibilityRole="link"
                    onPress={() => router.push(tip.href as Href)}
                    style={[styles.tipText, styles.tipLink, { color: c.primary }]}
                  >
                    {tip.text}
                  </Text>
                ) : (
                  <Text style={[styles.tipText, { color: c.textSecondary }]}>{tip.text}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
  },
  sub: {
    marginTop: Spacing.xs,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  score: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    fontFamily: FontFamily.bodyBold,
    fontWeight: '800',
  },
  outOf: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  track: {
    marginTop: Spacing.md,
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  tips: {
    marginTop: Spacing.lg,
  },
  tipsTitle: {
    marginBottom: Spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
  tipList: {
    gap: 6,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FontFamily.body,
  },
  tipLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
  },
});
